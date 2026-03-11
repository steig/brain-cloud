import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import { createDecisionSchema, updateDecisionSchema, decisionReviewSchema, validateBody } from './schemas'
import { upsertEmbedding, deleteEmbedding, vectorSearch } from '../db/vectorize'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// @ts-expect-error Hono deep type instantiation with complex query params
app.get('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)

  const teamId = url.searchParams.get('team_id')

  // Team-scoped query: return decisions from all team members
  if (teamId) {
    const member = await q.getTeamMember(c.env.DB, teamId, user.id)
    if (!member) return c.json({ error: 'Not a member of this team' }, 403)

    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const { results } = await c.env.DB.prepare(
      `SELECT d.*, p.name as project_name, p.repo_url as project_repo_url,
              u.name as user_name, u.avatar_url as user_avatar_url, u.github_username as user_github_username
       FROM decisions d
       JOIN team_members tm ON d.user_id = tm.user_id
       LEFT JOIN projects p ON d.project_id = p.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE tm.team_id = ? AND d.deleted_at IS NULL
       ORDER BY d.created_at DESC LIMIT ? OFFSET ?`
    ).bind(teamId, limit, offset).all()

    const transformed = results.map(r => ({
      ...r,
      tags: q.parseTags(r.tags as string | null),
      options: q.parseJson(r.options as string | null),
      projects: r.project_name ? { name: r.project_name, repo_url: r.project_repo_url } : undefined,
      users: r.user_name ? { id: r.user_id, name: r.user_name, avatar_url: r.user_avatar_url, github_username: r.user_github_username } : undefined,
    }))
    return c.json(transformed)
  }

  const opts: Parameters<typeof q.listDecisions>[2] = {
    withJoins: true,
    limit: parseInt(url.searchParams.get('limit') || '50'),
    offset: parseInt(url.searchParams.get('offset') || '0') || undefined,
  }

  for (const [key, value] of url.searchParams) {
    if (key === 'project_id' && value.startsWith('eq.')) opts.projectId = value.slice(3)
    if (key === 'ai_model' && value.startsWith('eq.')) opts.aiModel = value.slice(3)
    if (key === 'created_at' && value.startsWith('gte.')) opts.createdAfter = value.slice(4)
    if (key === 'created_at' && value.startsWith('lte.')) opts.createdBefore = value.slice(4)
    if (key === 'id' && value.startsWith('in.')) {
      const match = value.match(/in\.\((.+)\)/)
      if (match) opts.ids = match[1].split(',')
    }
    if (key === 'id' && value.startsWith('eq.')) {
      const row = await c.env.DB.prepare(
        'SELECT * FROM decisions WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
      ).bind(value.slice(3), user.id).all()
      return c.json(row.results.map(r => ({
        ...r,
        tags: q.parseTags((r as any).tags),
        options: q.parseJson((r as any).options),
      })))
    }
  }

  const results = await q.listDecisions(c.env.DB, user.id, opts)
  const transformed = results.map(r => ({
    ...r,
    tags: q.parseTags(r.tags),
    options: q.parseJson(r.options),
    projects: r.project_name ? { name: r.project_name, repo_url: r.project_repo_url } : undefined,
    users: r.user_name ? { id: r.user_id, name: r.user_name, avatar_url: r.user_avatar_url, github_username: r.user_github_username } : undefined,
  }))
  return c.json(transformed)
})

app.on('HEAD', '/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)
  const filter: { createdAfter?: string } = {}
  for (const [key, value] of url.searchParams) {
    if (key === 'created_at' && value.startsWith('gte.')) filter.createdAfter = value.slice(4)
  }
  const count = await q.countDecisions(c.env.DB, user.id, filter)
  return c.body(null, 200, { 'Content-Range': `0-0/${count}` })
})

app.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const v = validateBody(createDecisionSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)
  const decision = await q.createDecision(c.env.DB, user.id, v.data)

  c.executionCtx.waitUntil(
    upsertEmbedding(c.env, decision.id, `${decision.title} ${decision.chosen} ${decision.rationale}`, {
      type: 'decision',
      userId: user.id,
      projectId: decision.project_id ?? undefined,
      createdAt: decision.created_at,
    }).catch((e) => console.error('[vectorize] embedding failed:', e))
  )

  const prefer = c.req.header('Prefer')
  if (prefer?.includes('return=representation')) {
    return c.json([{
      ...decision,
      tags: q.parseTags(decision.tags),
      options: q.parseJson(decision.options),
    }], 201)
  }
  return c.body(null, 201)
})

app.patch('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)
  const idParam = url.searchParams.get('id')
  if (!idParam?.startsWith('eq.')) return c.json({ error: 'Missing id filter' }, 400)
  const body = await c.req.json()
  const v = validateBody(updateDecisionSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)
  await q.updateDecision(c.env.DB, user.id, idParam.slice(3), v.data)
  return c.body(null, 204)
})

app.delete('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)
  const idParam = url.searchParams.get('id')
  if (!idParam?.startsWith('eq.')) return c.json({ error: 'Missing id filter' }, 400)
  const decisionId = idParam.slice(3)
  await q.deleteDecision(c.env.DB, user.id, decisionId)
  c.executionCtx.waitUntil(
    deleteEmbedding(c.env, decisionId).catch(() => {})
  )
  return c.body(null, 204)
})

// GET /api/decisions/reviews — list all reviews for the user
app.get('/reviews', async (c) => {
  const user = c.get('user')
  const { results } = await c.env.DB.prepare(
    `SELECT dr.*, d.title as decision_title, d.chosen as decision_chosen
     FROM decision_reviews dr
     JOIN decisions d ON d.id = dr.decision_id
     WHERE dr.user_id = ?
     ORDER BY dr.created_at DESC
     LIMIT 100`
  ).bind(user.id).all()
  return c.json(results.map(r => ({
    ...r,
    would_decide_same: r.would_decide_same === 1,
  })))
})

// POST /api/decisions/reviews — create a review
app.post('/reviews', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const v = validateBody(decisionReviewSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)
  const result = await q.createDecisionReview(c.env.DB, user.id, v.data)
  return c.json(result, 201)
})

// GET /api/decisions/needing-review — decisions >14 days old with no review
app.get('/needing-review', async (c) => {
  const user = c.get('user')
  const { results } = await c.env.DB.prepare(
    `SELECT d.*
     FROM decisions d
     WHERE d.user_id = ? AND d.deleted_at IS NULL
       AND d.created_at <= datetime('now', '-14 days')
       AND d.id NOT IN (SELECT decision_id FROM decision_reviews WHERE user_id = ?)
     ORDER BY d.created_at ASC
     LIMIT 50`
  ).bind(user.id, user.id).all()
  return c.json(results.map(r => ({
    ...r,
    tags: q.parseTags((r as any).tags),
    options: q.parseJson((r as any).options),
  })))
})

// GET /api/decisions/review-stats — stats for the reviews page
app.get('/review-stats', async (c) => {
  const user = c.get('user')
  const stats = await c.env.DB.prepare(
    `SELECT
       COUNT(*) as total_reviews,
       AVG(CAST(outcome_rating AS REAL)) as avg_rating,
       SUM(CASE WHEN would_decide_same = 1 THEN 1 ELSE 0 END) as would_repeat,
       SUM(CASE WHEN outcome_rating >= 4 THEN 1 ELSE 0 END) as positive_outcomes
     FROM decision_reviews WHERE user_id = ?`
  ).bind(user.id).first()

  const totalDecisions = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM decisions WHERE user_id = ? AND deleted_at IS NULL`
  ).bind(user.id).first()

  const reviewedDecisions = await c.env.DB.prepare(
    `SELECT COUNT(DISTINCT decision_id) as count FROM decision_reviews WHERE user_id = ?`
  ).bind(user.id).first()

  const ratingDist = await c.env.DB.prepare(
    `SELECT CAST(outcome_rating AS INTEGER) as rating, COUNT(*) as count
     FROM decision_reviews
     WHERE user_id = ? AND outcome_rating IS NOT NULL
     GROUP BY CAST(outcome_rating AS INTEGER)
     ORDER BY rating`
  ).bind(user.id).all()

  return c.json({
    total_reviews: (stats as any)?.total_reviews ?? 0,
    avg_rating: (stats as any)?.avg_rating ?? 0,
    would_repeat: (stats as any)?.would_repeat ?? 0,
    positive_outcomes: (stats as any)?.positive_outcomes ?? 0,
    total_decisions: (totalDecisions as any)?.count ?? 0,
    reviewed_decisions: (reviewedDecisions as any)?.count ?? 0,
    rating_distribution: ratingDist.results,
  })
})

// GET /api/decisions/:id/related - Find related entries via vector similarity
app.get('/:id/related', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  // Verify ownership
  const decision = await c.env.DB.prepare(
    'SELECT id, title, chosen, rationale FROM decisions WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
  ).bind(id, user.id).first<{ id: string; title: string; chosen: string; rationale: string }>()
  if (!decision) return c.json({ error: 'Not found' }, 404)

  const queryText = `${decision.title} ${decision.chosen ?? ''} ${decision.rationale ?? ''}`
  const similar = await vectorSearch(c.env, queryText, user.id, { limit: 6 })

  // Remove self from results
  const related = similar.filter(r => r.id !== id).slice(0, 5)
  if (related.length === 0) return c.json([])

  // Fetch full records
  const placeholders = related.map(() => '?').join(',')
  const { results } = await c.env.DB.prepare(
    `SELECT id, content, type, created_at FROM thoughts WHERE id IN (${placeholders}) AND deleted_at IS NULL`
  ).bind(...related.map(r => r.id)).all()

  const { results: decResults } = await c.env.DB.prepare(
    `SELECT id, title, chosen, created_at FROM decisions WHERE id IN (${placeholders}) AND deleted_at IS NULL`
  ).bind(...related.map(r => r.id)).all()

  // Merge and add scores
  const scoreMap = new Map(related.map(r => [r.id, r.score]))
  const merged = [
    ...results.map(r => ({ id: r.id as string, content: r.content as string, type: r.type as string, created_at: r.created_at as string, similarity: scoreMap.get(r.id as string) ?? 0 })),
    ...decResults.map(d => ({ id: d.id as string, content: d.title as string, type: 'decision', created_at: d.created_at as string, similarity: scoreMap.get(d.id as string) ?? 0 })),
  ].sort((a, b) => b.similarity - a.similarity)

  return c.json(merged)
})

export { app as decisionRoutes }

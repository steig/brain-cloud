import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import { createThoughtSchema, updateThoughtSchema, validateBody } from './schemas'
import { upsertEmbedding, deleteEmbedding, vectorSearch } from '../db/vectorize'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/thoughts - List thoughts with filtering
app.get('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)

  const opts: Parameters<typeof q.listThoughts>[2] = {
    withJoins: true,
    limit: parseInt(url.searchParams.get('limit') || '50'),
  }

  // Parse PostgREST-style filters from query params
  for (const [key, value] of url.searchParams) {
    if (key === 'type' && value.startsWith('eq.')) opts.type = value.slice(3)
    if (key === 'type' && value.startsWith('not.in.')) {
      const match = value.match(/not\.in\.\((.+)\)/)
      if (match) opts.typeNotIn = match[1].split(',')
    }
    if (key === 'project_id' && value.startsWith('eq.')) opts.projectId = value.slice(3)
    if (key === 'ai_model' && value.startsWith('eq.')) opts.aiModel = value.slice(3)
    if (key === 'created_at' && value.startsWith('gte.')) opts.createdAfter = value.slice(4)
    if (key === 'created_at' && value.startsWith('lte.')) opts.createdBefore = value.slice(4)
    if (key === 'tags' && value.startsWith('cs.')) {
      const match = value.match(/cs\.\{(.+)\}/) || value.match(/cs\.%7B(.+)%7D/)
      if (match) opts.tagsContain = match[1].split(',')
    }
    if (key === 'order') {
      const parts = value.split('.')
      opts.orderBy = parts[0]
      opts.orderDir = parts[1] as 'asc' | 'desc' || 'desc'
    }
    if (key === 'id' && value.startsWith('eq.')) {
      // Single ID lookup
      const row = await c.env.DB.prepare(
        'SELECT * FROM thoughts WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
      ).bind(value.slice(3), user.id).all()
      return c.json(row.results)
    }
  }

  const results = await q.listThoughts(c.env.DB, user.id, opts)

  // Transform JSON TEXT fields back to objects for API response
  const transformed = results.map(r => ({
    ...r,
    tags: q.parseTags(r.tags),
    context: q.parseJson(r.context),
    projects: r.project_name ? { name: r.project_name, repo_url: r.project_repo_url } : undefined,
    users: r.user_name ? { id: r.user_id, name: r.user_name, avatar_url: r.user_avatar_url, github_username: r.user_github_username } : undefined,
  }))

  return c.json(transformed)
})

// HEAD /api/thoughts - Count with content-range header
app.on('HEAD', '/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)
  const filter: { createdAfter?: string; type?: string } = {}

  for (const [key, value] of url.searchParams) {
    if (key === 'created_at' && value.startsWith('gte.')) filter.createdAfter = value.slice(4)
    if (key === 'type' && value.startsWith('eq.')) filter.type = value.slice(3)
  }

  const count = await q.countThoughts(c.env.DB, user.id, filter)
  return c.body(null, 200, { 'Content-Range': `0-0/${count}` })
})

// POST /api/thoughts - Create thought
app.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const prefer = c.req.header('Prefer')

  const v = validateBody(createThoughtSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  const thought = await q.createThought(c.env.DB, user.id, v.data)

  c.executionCtx.waitUntil(
    upsertEmbedding(c.env, thought.id, `${thought.content}`, {
      type: 'thought',
      userId: user.id,
      projectId: thought.project_id ?? undefined,
      createdAt: thought.created_at,
    }).catch((e) => console.error('[vectorize] embedding failed:', e))
  )

  if (prefer?.includes('return=representation')) {
    return c.json([{
      ...thought,
      tags: q.parseTags(thought.tags),
      context: q.parseJson(thought.context),
    }], 201)
  }
  return c.body(null, 201)
})

// PATCH /api/thoughts?id=eq.<id> - Update thought
app.patch('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)
  const idParam = url.searchParams.get('id')
  if (!idParam?.startsWith('eq.')) return c.json({ error: 'Missing id filter' }, 400)

  const id = idParam.slice(3)
  const body = await c.req.json()
  const v = validateBody(updateThoughtSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)
  await q.updateThought(c.env.DB, user.id, id, v.data)
  return c.body(null, 204)
})

// DELETE /api/thoughts?id=eq.<id> - Delete thought
app.delete('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)
  const idParam = url.searchParams.get('id')
  if (!idParam?.startsWith('eq.')) return c.json({ error: 'Missing id filter' }, 400)

  const thoughtId = idParam.slice(3)
  await q.deleteThought(c.env.DB, user.id, thoughtId)
  c.executionCtx.waitUntil(
    deleteEmbedding(c.env, thoughtId).catch(() => {})
  )
  return c.body(null, 204)
})

// GET /api/thoughts/:id/related - Find related entries via vector similarity
app.get('/:id/related', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  // Verify ownership
  const thought = await c.env.DB.prepare(
    'SELECT id, content FROM thoughts WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
  ).bind(id, user.id).first<{ id: string; content: string }>()
  if (!thought) return c.json({ error: 'Not found' }, 404)

  const similar = await vectorSearch(c.env, thought.content, user.id, { limit: 6 })

  // Remove self from results
  const related = similar.filter(r => r.id !== id).slice(0, 5)
  if (related.length === 0) return c.json([])

  // Fetch full records
  const placeholders = related.map(() => '?').join(',')
  const { results } = await c.env.DB.prepare(
    `SELECT id, content, type, created_at FROM thoughts WHERE id IN (${placeholders}) AND deleted_at IS NULL`
  ).bind(...related.map(r => r.id)).all()

  // Also check decisions (vector search returns both types)
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

export { app as thoughtRoutes }

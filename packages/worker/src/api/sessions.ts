import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import { createSessionSchema, updateSessionSchema, validateBody } from './schemas'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.get('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)

  const teamId = url.searchParams.get('team_id')

  // Team-scoped query: return sessions from all team members
  if (teamId) {
    const member = await q.getTeamMember(c.env.DB, teamId, user.id)
    if (!member) return c.json({ error: 'Not a member of this team' }, 403)

    const limit = parseInt(url.searchParams.get('limit') || '30')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const { results } = await c.env.DB.prepare(
      `SELECT s.*, p.name as project_name,
              u.name as user_name, u.avatar_url as user_avatar_url, u.github_username as user_github_username
       FROM sessions s
       JOIN team_members tm ON s.user_id = tm.user_id
       LEFT JOIN projects p ON s.project_id = p.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE tm.team_id = ?
       ORDER BY s.started_at DESC LIMIT ? OFFSET ?`
    ).bind(teamId, limit, offset).all()

    const transformed = results.map(r => ({
      ...r,
      goals: q.parseTags(r.goals as string | null),
      accomplishments: q.parseTags(r.accomplishments as string | null),
      blockers: q.parseTags(r.blockers as string | null),
      metadata: q.parseJson(r.metadata as string | null),
      projects: r.project_name ? { name: r.project_name } : undefined,
      users: r.user_name ? { id: r.user_id, name: r.user_name, avatar_url: r.user_avatar_url, github_username: r.user_github_username } : undefined,
    }))
    return c.json(transformed)
  }

  const opts: Parameters<typeof q.listSessions>[2] = {
    limit: parseInt(url.searchParams.get('limit') || '30'),
    offset: parseInt(url.searchParams.get('offset') || '0') || undefined,
  }

  for (const [key, value] of url.searchParams) {
    if (key === 'project_id' && value.startsWith('eq.')) opts.projectId = value.slice(3)
    if (key === 'ai_model' && value.startsWith('eq.')) opts.aiModel = value.slice(3)
    if (key === 'started_at' && value.startsWith('gte.')) opts.startedAfter = value.slice(4)
    if (key === 'started_at' && value.startsWith('lte.')) opts.startedBefore = value.slice(4)
  }

  const results = await q.listSessions(c.env.DB, user.id, opts)

  // Fetch session scores if select includes them
  const selectParam = url.searchParams.get('select') || ''
  const includeScores = selectParam.includes('session_scores')

  const transformed = await Promise.all(results.map(async (r) => {
    const base = {
      ...r,
      goals: q.parseTags(r.goals),
      accomplishments: q.parseTags(r.accomplishments),
      blockers: q.parseTags(r.blockers),
      metadata: q.parseJson(r.metadata),
      projects: r.project_name ? { name: r.project_name } : undefined,
      users: r.user_name ? { id: r.user_id, name: r.user_name, avatar_url: r.user_avatar_url, github_username: r.user_github_username } : undefined,
    }

    if (includeScores) {
      const scores = await q.listSessionScores(c.env.DB, user.id, { sessionId: r.id })
      return { ...base, session_scores: scores }
    }
    return base
  }))

  return c.json(transformed)
})

app.on('HEAD', '/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)
  const filter: { startedAfter?: string; startedBefore?: string } = {}
  for (const [key, value] of url.searchParams) {
    if (key === 'started_at' && value.startsWith('gte.')) filter.startedAfter = value.slice(4)
    if (key === 'started_at' && value.startsWith('lte.')) filter.startedBefore = value.slice(4)
  }
  const count = await q.countSessions(c.env.DB, user.id, filter)
  return c.body(null, 200, { 'Content-Range': `0-0/${count}` })
})

app.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const v = validateBody(createSessionSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)
  const session = await q.createSession(c.env.DB, user.id, v.data)
  const prefer = c.req.header('Prefer')
  if (prefer?.includes('return=representation')) {
    return c.json([{
      ...session,
      goals: q.parseTags(session.goals),
      metadata: q.parseJson(session.metadata),
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
  const v = validateBody(updateSessionSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)
  const session = await q.updateSession(c.env.DB, user.id, idParam.slice(3), v.data)
  const prefer = c.req.header('Prefer')
  if (prefer?.includes('return=representation') && session) {
    return c.json([{
      ...session,
      goals: q.parseTags(session.goals),
      accomplishments: q.parseTags(session.accomplishments),
      blockers: q.parseTags(session.blockers),
      metadata: q.parseJson(session.metadata),
    }])
  }
  return c.body(null, 204)
})

export { app as sessionRoutes }

import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import { createSessionSchema, updateSessionSchema, validateBody } from './schemas'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.get('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)

  const opts: Parameters<typeof q.listSessions>[2] = {
    limit: parseInt(url.searchParams.get('limit') || '30'),
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

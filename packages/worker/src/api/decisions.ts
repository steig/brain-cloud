import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.get('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)

  const opts: Parameters<typeof q.listDecisions>[2] = {
    withJoins: true,
    limit: parseInt(url.searchParams.get('limit') || '50'),
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
        'SELECT * FROM decisions WHERE id = ? AND user_id = ?'
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
  const decision = await q.createDecision(c.env.DB, user.id, body)
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
  await q.updateDecision(c.env.DB, user.id, idParam.slice(3), body)
  return c.body(null, 204)
})

app.delete('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)
  const idParam = url.searchParams.get('id')
  if (!idParam?.startsWith('eq.')) return c.json({ error: 'Missing id filter' }, 400)
  await q.deleteDecision(c.env.DB, user.id, idParam.slice(3))
  return c.body(null, 204)
})

export { app as decisionRoutes }

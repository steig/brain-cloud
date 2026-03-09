import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import { createHandoffSchema, claimHandoffSchema, validateBody } from './schemas'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/handoffs - List handoffs
app.get('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)

  const opts: Parameters<typeof q.listHandoffs>[2] = {
    limit: parseInt(url.searchParams.get('limit') || '50'),
  }

  const project = url.searchParams.get('to_project')
  if (project) opts.toProject = project

  const status = url.searchParams.get('status')
  if (status) opts.status = status

  const results = await q.listHandoffs(c.env.DB, user.id, opts)

  return c.json(results.map(r => ({
    ...r,
    metadata: q.parseJson(r.metadata),
  })))
})

// POST /api/handoffs - Create handoff
app.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  const v = validateBody(createHandoffSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  const handoff = await q.createHandoff(c.env.DB, user.id, v.data)
  return c.json({ ...handoff, metadata: q.parseJson(handoff.metadata) }, 201)
})

// PATCH /api/handoffs/:id/claim - Claim a handoff
app.patch('/:id/claim', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const v = validateBody(claimHandoffSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  const claimed = await q.claimHandoff(c.env.DB, user.id, id, v.data.note)
  if (!claimed) {
    return c.json({ error: 'Handoff not found or already claimed' }, 404)
  }
  return c.json({ success: true, id })
})

export { app as handoffRoutes }

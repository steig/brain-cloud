import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/dx_events
app.get('/dx_events', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)
  const limit = parseInt(url.searchParams.get('limit') || '100')
  const results = await q.listDxEvents(c.env.DB, user.id, { limit })
  return c.json(results)
})

// GET /api/dx_costs
app.get('/dx_costs', async (c) => {
  const user = c.get('user')
  const results = await q.listDxCosts(c.env.DB, user.id)
  return c.json(results)
})

export { app as dxRoutes }

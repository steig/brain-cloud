import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.get('/', async (c) => {
  const results = await q.listProjects(c.env.DB)
  return c.json(results)
})

export { app as projectRoutes }

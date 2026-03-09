import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import { updateProjectSchema, validateBody } from './schemas'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.get('/', async (c) => {
  const results = await q.listProjects(c.env.DB)
  return c.json(results)
})

app.get('/:id', async (c) => {
  const project = await q.getProject(c.env.DB, c.req.param('id'))
  if (!project) return c.json({ error: 'Not found' }, 404)
  return c.json(project)
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const project = await q.getProject(c.env.DB, id)
  if (!project) return c.json({ error: 'Not found' }, 404)
  const body = await c.req.json()
  const v = validateBody(updateProjectSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)
  await q.updateProject(c.env.DB, id, v.data)
  const updated = await q.getProject(c.env.DB, id)
  return c.json(updated)
})

export { app as projectRoutes }

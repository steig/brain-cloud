import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import { createSentimentSchema, validateBody } from './schemas'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.get('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)
  const opts: { projectId?: string; aiModel?: string; limit?: number } = {
    limit: parseInt(url.searchParams.get('limit') || '50'),
  }
  for (const [key, value] of url.searchParams) {
    if (key === 'project_id' && value.startsWith('eq.')) opts.projectId = value.slice(3)
    if (key === 'ai_model' && value.startsWith('eq.')) opts.aiModel = value.slice(3)
  }
  const results = await q.listSentiment(c.env.DB, user.id, opts)
  return c.json(results)
})

app.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const v = validateBody(createSentimentSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)
  const result = await q.createSentiment(c.env.DB, user.id, v.data)
  return c.json(result, 201)
})

export { app as sentimentRoutes }

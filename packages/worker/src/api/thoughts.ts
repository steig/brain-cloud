import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import { createThoughtSchema, updateThoughtSchema, validateBody } from './schemas'

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

  await q.deleteThought(c.env.DB, user.id, idParam.slice(3))
  return c.body(null, 204)
})

export { app as thoughtRoutes }

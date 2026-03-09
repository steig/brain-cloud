import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/reminders - List reminders
app.get('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)
  const status = url.searchParams.get('status') as 'pending' | 'completed' | 'dismissed' | null
  const limit = parseInt(url.searchParams.get('limit') || '50')

  const reminders = await q.listReminders(c.env.DB, user.id, {
    status: status ?? undefined,
    limit,
  })

  return c.json(reminders)
})

// POST /api/reminders - Create reminder
app.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ content?: string; due_at?: string; project_id?: string }>()

  if (!body.content) return c.json({ error: 'content is required' }, 400)
  if (!body.due_at) return c.json({ error: 'due_at is required' }, 400)

  const reminder = await q.createReminder(c.env.DB, user.id, {
    content: body.content,
    due_at: body.due_at,
    project_id: body.project_id,
  })

  return c.json(reminder, 201)
})

// PATCH /api/reminders/:id - Complete or dismiss
app.patch('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json<{ action: string }>().catch(() => {
    return null
  })
  if (!body?.action) return c.json({ error: 'action must be "complete" or "dismiss"' }, 400)

  if (body.action === 'complete') {
    const success = await q.completeReminder(c.env.DB, user.id, id)
    if (!success) return c.json({ error: 'Reminder not found or already completed' }, 404)
    return c.json({ success: true })
  }

  if (body.action === 'dismiss') {
    const success = await q.dismissReminder(c.env.DB, user.id, id)
    if (!success) return c.json({ error: 'Reminder not found or already dismissed' }, 404)
    return c.json({ success: true })
  }

  return c.json({ error: 'action must be "complete" or "dismiss"' }, 400)
})

// DELETE /api/reminders/:id - Hard delete
app.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const success = await q.deleteReminder(c.env.DB, user.id, id)
  if (!success) return c.json({ error: 'Reminder not found' }, 404)
  return c.body(null, 204)
})

export { app as reminderRoutes }

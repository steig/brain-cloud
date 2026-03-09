import { Hono } from 'hono'
import type { Env, Variables } from '../types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/notifications — list user's notifications
app.get('/', async (c) => {
  const user = c.get('user')
  const unreadOnly = c.req.query('unread') === 'true'
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)

  let sql = 'SELECT * FROM notifications WHERE user_id = ?'
  const params: unknown[] = [user.id]
  if (unreadOnly) {
    sql += ' AND read_at IS NULL'
  }
  sql += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()

  // Also get unread count
  const unread = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL'
  ).bind(user.id).first<{ count: number }>()

  return c.json({ notifications: results, unread_count: unread?.count ?? 0 })
})

// PATCH /api/notifications/:id/read — mark as read
app.patch('/:id/read', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  await c.env.DB.prepare(
    "UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).bind(id, user.id).run()
  return c.body(null, 204)
})

// POST /api/notifications/read-all — mark all as read
app.post('/read-all', async (c) => {
  const user = c.get('user')
  await c.env.DB.prepare(
    "UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL"
  ).bind(user.id).run()
  return c.body(null, 204)
})

export { app as notificationRoutes }

export async function createNotification(
  db: D1Database,
  userId: string,
  type: string,
  title: string,
  message?: string,
  link?: string,
): Promise<void> {
  await db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(crypto.randomUUID(), userId, type, title, message ?? null, link ?? null).run()
}

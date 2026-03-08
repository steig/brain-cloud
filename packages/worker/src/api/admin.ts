import { Hono } from 'hono'
import type { Env, Variables } from '../types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Admin guard middleware
app.use('*', async (c, next) => {
  const user = c.get('user')
  if (user.system_role !== 'admin' && user.system_role !== 'super_admin') {
    return c.json({ error: 'Admin access required', code: 'FORBIDDEN' }, 403)
  }
  await next()
})

// GET /api/admin/stats — system dashboard stats
app.get('/stats', async (c) => {
  const [users, thoughts, decisions, sessions, apiKeys] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM thoughts').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM decisions').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM sessions').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM api_keys WHERE revoked_at IS NULL').first<{ count: number }>(),
  ])

  // Activity over last 7 days
  const { results: dailyActivity } = await c.env.DB.prepare(`
    SELECT DATE(created_at) as date,
           SUM(CASE WHEN type = 'thought' THEN 1 ELSE 0 END) as thoughts,
           SUM(CASE WHEN type = 'decision' THEN 1 ELSE 0 END) as decisions,
           SUM(CASE WHEN type = 'session' THEN 1 ELSE 0 END) as sessions
    FROM (
      SELECT created_at, 'thought' as type FROM thoughts WHERE created_at >= datetime('now', '-7 days')
      UNION ALL
      SELECT created_at, 'decision' FROM decisions WHERE created_at >= datetime('now', '-7 days')
      UNION ALL
      SELECT created_at, 'session' FROM sessions WHERE created_at >= datetime('now', '-7 days')
    )
    GROUP BY DATE(created_at)
    ORDER BY date
  `).all()

  // Top users by activity
  const { results: topUsers } = await c.env.DB.prepare(`
    SELECT u.id, u.name, u.email, u.system_role, u.created_at,
           (SELECT COUNT(*) FROM thoughts t WHERE t.user_id = u.id) as thought_count,
           (SELECT COUNT(*) FROM decisions d WHERE d.user_id = u.id) as decision_count,
           (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) as session_count
    FROM users u
    ORDER BY thought_count + decision_count + session_count DESC
    LIMIT 10
  `).all()

  return c.json({
    totals: {
      users: users?.count ?? 0,
      thoughts: thoughts?.count ?? 0,
      decisions: decisions?.count ?? 0,
      sessions: sessions?.count ?? 0,
      api_keys: apiKeys?.count ?? 0,
    },
    daily_activity: dailyActivity,
    top_users: topUsers,
  })
})

// GET /api/admin/users — user list with pagination
app.get('/users', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
  const offset = parseInt(c.req.query('offset') || '0')
  const search = c.req.query('search')

  let sql = `SELECT u.id, u.name, u.email, u.avatar, u.system_role, u.created_at,
             (SELECT COUNT(*) FROM thoughts t WHERE t.user_id = u.id) as thought_count,
             (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) as session_count
             FROM users u`
  const params: unknown[] = []

  if (search) {
    sql += ' WHERE u.name LIKE ? OR u.email LIKE ?'
    params.push(`%${search}%`, `%${search}%`)
  }

  sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()

  const total = await c.env.DB.prepare(
    search
      ? 'SELECT COUNT(*) as count FROM users WHERE name LIKE ? OR email LIKE ?'
      : 'SELECT COUNT(*) as count FROM users'
  ).bind(...(search ? [`%${search}%`, `%${search}%`] : [])).first<{ count: number }>()

  return c.json({ users: results, total: total?.count ?? 0 })
})

// GET /api/admin/users/:id — user detail with all data counts
app.get('/users/:id', async (c) => {
  const userId = c.req.param('id')

  const user = await c.env.DB.prepare(
    'SELECT id, name, email, avatar, system_role, created_at FROM users WHERE id = ?'
  ).bind(userId).first()
  if (!user) return c.json({ error: 'User not found' }, 404)

  const [thoughts, decisions, sessions, keys, teams] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM thoughts WHERE user_id = ?').bind(userId).first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM decisions WHERE user_id = ?').bind(userId).first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').bind(userId).first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM api_keys WHERE user_id = ? AND revoked_at IS NULL').bind(userId).first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM team_members WHERE user_id = ?').bind(userId).first<{ count: number }>(),
  ])

  return c.json({
    ...user,
    counts: {
      thoughts: thoughts?.count ?? 0,
      decisions: decisions?.count ?? 0,
      sessions: sessions?.count ?? 0,
      api_keys: keys?.count ?? 0,
      teams: teams?.count ?? 0,
    },
  })
})

// PATCH /api/admin/users/:id — update user role
app.patch('/users/:id', async (c) => {
  const user = c.get('user')
  const userId = c.req.param('id')
  const { system_role } = await c.req.json<{ system_role: string }>()

  if (!['user', 'admin', 'super_admin'].includes(system_role)) {
    return c.json({ error: 'Invalid role' }, 400)
  }

  // Only super_admin can promote to admin/super_admin
  if (system_role !== 'user' && user.system_role !== 'super_admin') {
    return c.json({ error: 'Only super admins can promote users' }, 403)
  }

  // Can't demote yourself
  if (userId === user.id) {
    return c.json({ error: 'Cannot change your own role' }, 400)
  }

  await c.env.DB.prepare(
    'UPDATE users SET system_role = ? WHERE id = ?'
  ).bind(system_role, userId).run()

  return c.body(null, 204)
})

export { app as adminRoutes }

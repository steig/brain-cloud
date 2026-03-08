import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import {
  createTeamSchema, updateTeamSchema, addMemberSchema, createInviteSchema, validateBody,
} from './schemas'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

/** Check if the authenticated user has the required role on a team */
async function requireTeamRole(
  db: D1Database,
  teamId: string,
  userId: string,
  allowedRoles: string[]
): Promise<{ role: string } | null> {
  const member = await q.getTeamMember(db, teamId, userId)
  if (!member || !allowedRoles.includes(member.role)) return null
  return member
}

// POST /api/teams — create team
app.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const v = validateBody(createTeamSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  // Check slug uniqueness
  const existing = await c.env.DB.prepare(
    'SELECT id FROM teams WHERE slug = ?'
  ).bind(v.data.slug).first()
  if (existing) return c.json({ error: 'Team slug already taken' }, 409)

  const team = await q.createTeam(c.env.DB, user.id, v.data)
  return c.json(team, 201)
})

// GET /api/teams — list user's teams
app.get('/', async (c) => {
  const user = c.get('user')
  const teams = await q.listUserTeams(c.env.DB, user.id)
  return c.json(teams)
})

// POST /api/teams/join/:token — accept invite (must be before /:id routes)
app.post('/join/:token', async (c) => {
  const user = c.get('user')
  const token = c.req.param('token')
  if (!token || token.length < 10 || token.length > 100) {
    return c.json({ error: 'Invalid invite token' }, 400)
  }

  const invite = await q.getTeamInviteByToken(c.env.DB, token)
  if (!invite) return c.json({ error: 'Invite not found' }, 404)

  // Check if already accepted
  if (invite.accepted_at) return c.json({ error: 'Invite already accepted' }, 409)

  // Check expiry
  if (new Date(invite.expires_at as string) < new Date()) {
    return c.json({ error: 'Invite has expired' }, 410)
  }

  // Check if already a member
  const existing = await q.getTeamMember(c.env.DB, invite.team_id as string, user.id)
  if (existing) return c.json({ error: 'Already a member of this team' }, 409)

  // Add member and mark invite accepted
  await q.addTeamMember(c.env.DB, invite.team_id as string, user.id, invite.role as string, invite.invited_by as string)
  await q.acceptTeamInvite(c.env.DB, invite.id as string)

  return c.json({ message: 'Joined team successfully', team_id: invite.team_id }, 200)
})

// GET /api/teams/:id — get team with members
app.get('/:id', async (c) => {
  const user = c.get('user')
  const teamId = c.req.param('id')

  // Must be a member to view
  const member = await q.getTeamMember(c.env.DB, teamId, user.id)
  if (!member) return c.json({ error: 'Team not found' }, 404)

  const team = await q.getTeam(c.env.DB, teamId)
  if (!team) return c.json({ error: 'Team not found' }, 404)

  const members = await q.getTeamMembers(c.env.DB, teamId)
  return c.json({ ...team, members })
})

// PATCH /api/teams/:id — update team (owner/admin only)
app.patch('/:id', async (c) => {
  const user = c.get('user')
  const teamId = c.req.param('id')

  if (!await requireTeamRole(c.env.DB, teamId, user.id, ['owner', 'admin'])) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const v = validateBody(updateTeamSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  await q.updateTeam(c.env.DB, teamId, v.data)
  return c.body(null, 204)
})

// DELETE /api/teams/:id — delete team (owner only)
app.delete('/:id', async (c) => {
  const user = c.get('user')
  const teamId = c.req.param('id')

  if (!await requireTeamRole(c.env.DB, teamId, user.id, ['owner'])) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await q.deleteTeam(c.env.DB, teamId)
  return c.body(null, 204)
})

// POST /api/teams/:id/members — add member
app.post('/:id/members', async (c) => {
  const user = c.get('user')
  const teamId = c.req.param('id')

  if (!await requireTeamRole(c.env.DB, teamId, user.id, ['owner', 'admin'])) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const v = validateBody(addMemberSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  // Check if already a member
  const existing = await q.getTeamMember(c.env.DB, teamId, v.data.user_id)
  if (existing) return c.json({ error: 'User is already a member' }, 409)

  const member = await q.addTeamMember(c.env.DB, teamId, v.data.user_id, v.data.role ?? 'member', user.id)
  return c.json(member, 201)
})

// DELETE /api/teams/:id/members/:userId — remove member
app.delete('/:id/members/:userId', async (c) => {
  const user = c.get('user')
  const teamId = c.req.param('id')
  const targetUserId = c.req.param('userId')

  if (!await requireTeamRole(c.env.DB, teamId, user.id, ['owner', 'admin'])) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  // Can't remove the owner
  const targetMember = await q.getTeamMember(c.env.DB, teamId, targetUserId)
  if (!targetMember) return c.json({ error: 'Member not found' }, 404)
  if (targetMember.role === 'owner') return c.json({ error: 'Cannot remove team owner' }, 403)

  await q.removeTeamMember(c.env.DB, teamId, targetUserId)
  return c.body(null, 204)
})

// GET /api/teams/:id/invites — list pending invites
app.get('/:id/invites', async (c) => {
  const user = c.get('user')
  const teamId = c.req.param('id')

  if (!await requireTeamRole(c.env.DB, teamId, user.id, ['owner', 'admin'])) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const invites = await q.listTeamInvites(c.env.DB, teamId)
  return c.json(invites)
})

// DELETE /api/teams/:id/invites/:inviteId — cancel invite
app.delete('/:id/invites/:inviteId', async (c) => {
  const user = c.get('user')
  const teamId = c.req.param('id')
  const inviteId = c.req.param('inviteId')

  if (!await requireTeamRole(c.env.DB, teamId, user.id, ['owner', 'admin'])) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await q.deleteTeamInvite(c.env.DB, inviteId)
  return c.body(null, 204)
})

// POST /api/teams/:id/invites — create invite
app.post('/:id/invites', async (c) => {
  const user = c.get('user')
  const teamId = c.req.param('id')

  if (!await requireTeamRole(c.env.DB, teamId, user.id, ['owner', 'admin'])) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const v = validateBody(createInviteSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  // Check for existing pending invite
  const existing = await c.env.DB.prepare(
    `SELECT id FROM team_invites WHERE team_id = ? AND email = ? AND accepted_at IS NULL AND expires_at > datetime('now')`
  ).bind(teamId, v.data.email).first()
  if (existing) return c.json({ error: 'Pending invite already exists for this email' }, 409)

  const invite = await q.createTeamInvite(c.env.DB, teamId, user.id, v.data.email, v.data.role ?? 'member')
  return c.json(invite, 201)
})

// GET /api/teams/:id/stats — team admin dashboard stats (admin/owner only)
app.get('/:id/stats', async (c) => {
  const user = c.get('user')
  const teamId = c.req.param('id')

  if (!await requireTeamRole(c.env.DB, teamId, user.id, ['owner', 'admin'])) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const db = c.env.DB

  // Total members
  const memberCount = await db.prepare(
    'SELECT COUNT(*) as cnt FROM team_members WHERE team_id = ?'
  ).bind(teamId).first<{ cnt: number }>()

  // Aggregate counts across team
  const thoughtCount = await db.prepare(
    `SELECT COUNT(*) as cnt FROM thoughts t
     JOIN team_members tm ON t.user_id = tm.user_id
     WHERE tm.team_id = ? AND t.deleted_at IS NULL`
  ).bind(teamId).first<{ cnt: number }>()

  const decisionCount = await db.prepare(
    `SELECT COUNT(*) as cnt FROM decisions d
     JOIN team_members tm ON d.user_id = tm.user_id
     WHERE tm.team_id = ? AND d.deleted_at IS NULL`
  ).bind(teamId).first<{ cnt: number }>()

  const sessionCount = await db.prepare(
    `SELECT COUNT(*) as cnt FROM sessions s
     JOIN team_members tm ON s.user_id = tm.user_id
     WHERE tm.team_id = ?`
  ).bind(teamId).first<{ cnt: number }>()

  // Per-member activity
  const { results: memberActivity } = await db.prepare(
    `SELECT
       u.id as user_id,
       u.name,
       u.avatar_url,
       tm.role,
       (SELECT COUNT(*) FROM thoughts WHERE user_id = u.id AND deleted_at IS NULL) as thoughts,
       (SELECT COUNT(*) FROM decisions WHERE user_id = u.id AND deleted_at IS NULL) as decisions,
       (SELECT COUNT(*) FROM sessions WHERE user_id = u.id) as sessions,
       COALESCE(
         (SELECT MAX(created_at) FROM thoughts WHERE user_id = u.id AND deleted_at IS NULL),
         (SELECT MAX(started_at) FROM sessions WHERE user_id = u.id),
         tm.joined_at
       ) as last_active
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = ?
     ORDER BY last_active DESC`
  ).bind(teamId).all()

  return c.json({
    members: memberCount?.cnt ?? 0,
    thoughts: thoughtCount?.cnt ?? 0,
    decisions: decisionCount?.cnt ?? 0,
    sessions: sessionCount?.cnt ?? 0,
    member_activity: memberActivity,
  })
})

// GET /api/teams/:id/feed — unified activity feed for workspace overview
app.get('/:id/feed', async (c) => {
  const user = c.get('user')
  const teamId = c.req.param('id')
  const url = new URL(c.req.url)
  const limit = parseInt(url.searchParams.get('limit') || '50')

  // Must be a member to view
  const member = await q.getTeamMember(c.env.DB, teamId, user.id)
  if (!member) return c.json({ error: 'Team not found' }, 404)

  const db = c.env.DB

  // Fetch recent thoughts, decisions, sessions from all team members and unify
  const { results: thoughts } = await db.prepare(
    `SELECT t.id, 'thought' as type, t.content, NULL as title, t.type as thought_type,
            t.tags, t.created_at, u.name as user_name, u.avatar_url as user_avatar
     FROM thoughts t
     JOIN team_members tm ON t.user_id = tm.user_id
     JOIN users u ON t.user_id = u.id
     WHERE tm.team_id = ? AND t.deleted_at IS NULL
     ORDER BY t.created_at DESC LIMIT ?`
  ).bind(teamId, limit).all()

  const { results: decisions } = await db.prepare(
    `SELECT d.id, 'decision' as type, NULL as content, d.title, NULL as thought_type,
            d.tags, d.created_at, u.name as user_name, u.avatar_url as user_avatar
     FROM decisions d
     JOIN team_members tm ON d.user_id = tm.user_id
     JOIN users u ON d.user_id = u.id
     WHERE tm.team_id = ? AND d.deleted_at IS NULL
     ORDER BY d.created_at DESC LIMIT ?`
  ).bind(teamId, limit).all()

  const { results: sessions } = await db.prepare(
    `SELECT s.id, 'session' as type, s.summary as content, NULL as title, NULL as thought_type,
            NULL as tags, s.started_at as created_at, u.name as user_name, u.avatar_url as user_avatar
     FROM sessions s
     JOIN team_members tm ON s.user_id = tm.user_id
     JOIN users u ON s.user_id = u.id
     WHERE tm.team_id = ?
     ORDER BY s.started_at DESC LIMIT ?`
  ).bind(teamId, limit).all()

  // Merge, sort, limit
  type FeedItem = Record<string, unknown> & { created_at: string; tags?: string[] | string | null }
  const allItems: FeedItem[] = [...thoughts, ...decisions, ...sessions] as FeedItem[]
  const feed = allItems
    .map(item => ({
      ...item,
      tags: item.tags ? q.parseTags(item.tags as string) : undefined,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

  return c.json(feed)
})

export { app as teamRoutes }

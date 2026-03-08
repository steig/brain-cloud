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

export { app as teamRoutes }

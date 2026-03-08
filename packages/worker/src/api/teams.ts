import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import {
  createTeamSchema, updateTeamSchema, addMemberSchema, createInviteSchema, validateBody,
} from './schemas'
import { sendEmail, teamInviteEmail } from '../email'

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

  // Send invite email (non-blocking)
  const team = await q.getTeam(c.env.DB, teamId)
  const inviteUrl = `${c.env.FRONTEND_URL}/teams/join/${invite.token}`
  const emailData = teamInviteEmail((team?.name as string) ?? 'a team', user.name, inviteUrl)
  emailData.to = v.data.email
  c.executionCtx.waitUntil(
    sendEmail(c.env, emailData).catch(e => console.error('[email] invite failed:', e))
  )

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

  // Parallel aggregate counts
  const [memberCount, thoughtCount, decisionCount, sessionCount] = await Promise.all([
    db.prepare('SELECT COUNT(*) as cnt FROM team_members WHERE team_id = ?')
      .bind(teamId).first<{ cnt: number }>(),
    db.prepare(
      `SELECT COUNT(*) as cnt FROM thoughts t
       JOIN team_members tm ON t.user_id = tm.user_id
       WHERE tm.team_id = ? AND t.deleted_at IS NULL`
    ).bind(teamId).first<{ cnt: number }>(),
    db.prepare(
      `SELECT COUNT(*) as cnt FROM decisions d
       JOIN team_members tm ON d.user_id = tm.user_id
       WHERE tm.team_id = ? AND d.deleted_at IS NULL`
    ).bind(teamId).first<{ cnt: number }>(),
    db.prepare(
      `SELECT COUNT(*) as cnt FROM sessions s
       JOIN team_members tm ON s.user_id = tm.user_id
       WHERE tm.team_id = ?`
    ).bind(teamId).first<{ cnt: number }>(),
  ])

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

  // Single UNION query sorted and limited at the DB level
  const { results: rawFeed } = await db.prepare(
    `SELECT * FROM (
       SELECT t.id, 'thought' as type, t.content, NULL as title, t.type as thought_type,
              t.tags, t.created_at, u.name as user_name, u.avatar_url as user_avatar
       FROM thoughts t
       JOIN team_members tm ON t.user_id = tm.user_id
       JOIN users u ON t.user_id = u.id
       WHERE tm.team_id = ? AND t.deleted_at IS NULL
       UNION ALL
       SELECT d.id, 'decision' as type, NULL as content, d.title, NULL as thought_type,
              d.tags, d.created_at, u.name as user_name, u.avatar_url as user_avatar
       FROM decisions d
       JOIN team_members tm ON d.user_id = tm.user_id
       JOIN users u ON d.user_id = u.id
       WHERE tm.team_id = ? AND d.deleted_at IS NULL
       UNION ALL
       SELECT s.id, 'session' as type, s.summary as content, NULL as title, NULL as thought_type,
              NULL as tags, s.started_at as created_at, u.name as user_name, u.avatar_url as user_avatar
       FROM sessions s
       JOIN team_members tm ON s.user_id = tm.user_id
       JOIN users u ON s.user_id = u.id
       WHERE tm.team_id = ?
     ) ORDER BY created_at DESC LIMIT ?`
  ).bind(teamId, teamId, teamId, limit).all()

  type FeedItem = Record<string, unknown> & { created_at: string; tags?: string[] | string | null }
  const feed = (rawFeed as FeedItem[]).map(item => ({
    ...item,
    tags: item.tags ? q.parseTags(item.tags as string) : undefined,
  }))

  return c.json(feed)
})

// GET /api/teams/:id/coaching — AI-generated team coaching insights
app.get('/:id/coaching', async (c) => {
  const user = c.get('user')
  const teamId = c.req.param('id')
  const days = Math.min(parseInt(c.req.query('days') || '7'), 90)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // Must be a member to view
  const member = await q.getTeamMember(c.env.DB, teamId, user.id)
  if (!member) return c.json({ error: 'Team not found' }, 404)

  const db = c.env.DB

  // Aggregate team data for AI analysis
  const memberCount = await db.prepare(
    'SELECT COUNT(*) as cnt FROM team_members WHERE team_id = ?'
  ).bind(teamId).first<{ cnt: number }>()

  // Activity volume per member
  const { results: memberActivity } = await db.prepare(
    `SELECT u.name,
       (SELECT COUNT(*) FROM thoughts WHERE user_id = u.id AND deleted_at IS NULL AND created_at >= ?) as thoughts,
       (SELECT COUNT(*) FROM decisions WHERE user_id = u.id AND deleted_at IS NULL AND created_at >= ?) as decisions,
       (SELECT COUNT(*) FROM sessions WHERE user_id = u.id AND started_at >= ?) as sessions
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = ?`
  ).bind(since, since, since, teamId).all()

  // Blockers across team
  const { results: blockers } = await db.prepare(
    `SELECT t.content, u.name as user_name
     FROM thoughts t
     JOIN team_members tm ON t.user_id = tm.user_id
     JOIN users u ON t.user_id = u.id
     WHERE tm.team_id = ? AND t.type = 'blocker' AND t.deleted_at IS NULL AND t.created_at >= ?
     ORDER BY t.created_at DESC LIMIT 20`
  ).bind(teamId, since).all()

  // Recent decisions
  const { results: recentDecisions } = await db.prepare(
    `SELECT d.title, d.chosen, u.name as user_name
     FROM decisions d
     JOIN team_members tm ON d.user_id = tm.user_id
     JOIN users u ON d.user_id = u.id
     WHERE tm.team_id = ? AND d.deleted_at IS NULL AND d.created_at >= ?
     ORDER BY d.created_at DESC LIMIT 20`
  ).bind(teamId, since).all()

  // Sentiment across team
  const { results: sentiment } = await db.prepare(
    `SELECT s.feeling, COUNT(*) as count, AVG(s.intensity) as avg_intensity
     FROM sentiment s
     JOIN team_members tm ON s.user_id = tm.user_id
     WHERE tm.team_id = ? AND s.created_at >= ?
     GROUP BY s.feeling
     ORDER BY count DESC`
  ).bind(teamId, since).all()

  // Generate coaching with Workers AI
  const prompt = `You are a team productivity coach. Analyze this team's data from the last ${days} days and provide coaching insights.

Team size: ${memberCount?.cnt ?? 0} members

Member Activity:
${memberActivity.map((m: Record<string, unknown>) => `- ${m.name}: ${m.thoughts} thoughts, ${m.decisions} decisions, ${m.sessions} sessions`).join('\n')}

Recent Blockers:
${blockers.length > 0 ? blockers.map((b: Record<string, unknown>) => `- ${b.user_name}: ${b.content}`).join('\n') : 'None reported'}

Recent Decisions:
${recentDecisions.length > 0 ? recentDecisions.map((d: Record<string, unknown>) => `- ${d.user_name}: ${d.title} → ${d.chosen}`).join('\n') : 'None recorded'}

Team Sentiment:
${sentiment.length > 0 ? sentiment.map((s: Record<string, unknown>) => `- ${s.feeling}: ${s.count} entries (avg intensity: ${Number(s.avg_intensity).toFixed(1)})`).join('\n') : 'No sentiment data'}

Provide a JSON response with this exact structure:
{
  "productivity_score": <number 1-100>,
  "highlights": ["<string>", ...],
  "challenges": ["<string>", ...],
  "suggestions": ["<string>", ...],
  "collaboration_patterns": ["<string>", ...]
}

Be specific, actionable, and encouraging. Keep each item to 1-2 sentences.`

  if (!c.env.AI) {
    return c.json({ error: 'AI features require Workers AI binding. Add [[ai]] to wrangler.toml to enable.' }, 501)
  }

  try {
    const aiResponse = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
      messages: [{ role: 'user', content: prompt }],
    }) as { response?: string }

    let coaching
    try {
      const raw = aiResponse.response ?? ''
      // Extract JSON from the response (may be wrapped in markdown code blocks)
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      coaching = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        productivity_score: 50,
        highlights: ['Unable to parse AI response'],
        challenges: [],
        suggestions: ['Try regenerating the coaching insights'],
        collaboration_patterns: [],
      }
    } catch {
      coaching = {
        productivity_score: 50,
        highlights: ['AI response could not be parsed'],
        challenges: [],
        suggestions: ['Try regenerating the coaching insights'],
        collaboration_patterns: [],
      }
    }

    return c.json({
      ...coaching,
      period_days: days,
      member_count: memberCount?.cnt ?? 0,
      generated_at: new Date().toISOString(),
    })
  } catch {
    return c.json({
      productivity_score: null,
      highlights: [],
      challenges: [],
      suggestions: ['AI coaching is temporarily unavailable. Please try again later.'],
      collaboration_patterns: [],
      period_days: days,
      member_count: memberCount?.cnt ?? 0,
      generated_at: new Date().toISOString(),
    })
  }
})

export { app as teamRoutes }

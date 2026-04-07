import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import * as q from '../db/queries'
import {
  createOrchestratorAgentSchema,
  updateOrchestratorAgentSchema,
  createOrchestratorRoomSchema,
  createOrchestratorMessageSchema,
  upsertOrchestratorPresenceSchema,
  validateBody,
} from './schemas'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

async function ensureRoom(db: D1Database, userId: string, roomId: string): Promise<boolean> {
  const existing = await db.prepare(
    `SELECT id FROM orchestrator_rooms WHERE id = ? AND user_id = ?`
  ).bind(roomId, userId).first<{ id: string }>()
  return !!existing
}

// GET /api/orchestrator/agents
app.get('/agents', async (c) => {
  const user = c.get('user')
  const agents = await q.listOrchestratorAgents(c.env.DB, user.id)
  return c.json(agents.map(a => ({ ...a, metadata: q.parseJson(a.metadata) })))
})

// POST /api/orchestrator/agents
app.post('/agents', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const v = validateBody(createOrchestratorAgentSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  const agent = await q.upsertOrchestratorAgent(c.env.DB, user.id, v.data)
  return c.json({ ...agent, metadata: q.parseJson(agent.metadata) }, 201)
})

// PATCH /api/orchestrator/agents/:id
app.patch('/agents/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const v = validateBody(updateOrchestratorAgentSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  if (v.data.status) {
    const updated = await q.updateOrchestratorAgentStatus(c.env.DB, user.id, id, v.data.status)
    if (!updated) return c.json({ error: 'Agent not found' }, 404)
  } else {
    return c.json({ error: 'No updates provided' }, 400)
  }

  const agents = await q.listOrchestratorAgents(c.env.DB, user.id)
  const agent = agents.find(a => a.id === id)
  if (!agent) return c.json({ error: 'Agent not found' }, 404)
  return c.json({ ...agent, metadata: q.parseJson(agent.metadata) })
})

// GET /api/orchestrator/rooms
app.get('/rooms', async (c) => {
  const user = c.get('user')
  const rooms = await q.listOrchestratorRooms(c.env.DB, user.id)
  return c.json(rooms.map(r => ({ ...r, metadata: q.parseJson(r.metadata) })))
})

// POST /api/orchestrator/rooms
app.post('/rooms', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const v = validateBody(createOrchestratorRoomSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  const room = await q.createOrchestratorRoom(c.env.DB, user.id, v.data)
  return c.json({ ...room, metadata: q.parseJson(room.metadata) }, 201)
})

// GET /api/orchestrator/rooms/:id/messages
app.get('/rooms/:id/messages', async (c) => {
  const user = c.get('user')
  const roomId = c.req.param('id')
  const ok = await ensureRoom(c.env.DB, user.id, roomId)
  if (!ok) return c.json({ error: 'Room not found' }, 404)
  const url = new URL(c.req.url)

  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50') || 50, 1), 500)
  const before = url.searchParams.get('before') || undefined

  const messages = await q.listOrchestratorMessages(c.env.DB, user.id, roomId, { limit, before })
  return c.json(messages.map(m => ({ ...m, metadata: q.parseJson(m.metadata) })))
})

// POST /api/orchestrator/rooms/:id/messages
app.post('/rooms/:id/messages', async (c) => {
  const user = c.get('user')
  const roomId = c.req.param('id')
  const ok = await ensureRoom(c.env.DB, user.id, roomId)
  if (!ok) return c.json({ error: 'Room not found' }, 404)
  const body = await c.req.json()
  const v = validateBody(createOrchestratorMessageSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  const message = await q.createOrchestratorMessage(c.env.DB, user.id, roomId, v.data)
  return c.json({ ...message, metadata: q.parseJson(message.metadata) }, 201)
})

// POST /api/orchestrator/presence
app.post('/presence', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const v = validateBody(upsertOrchestratorPresenceSchema, body)
  if (!v.success) return c.json({ error: v.error, details: v.details }, 400)

  const ok = await ensureRoom(c.env.DB, user.id, v.data.room_id)
  if (!ok) return c.json({ error: 'Room not found' }, 404)

  const presence = await q.upsertOrchestratorPresence(
    c.env.DB,
    user.id,
    v.data.room_id,
    v.data.agent_id,
    v.data.status || 'online',
    v.data.metadata
  )
  return c.json({ ...presence, metadata: q.parseJson(presence.metadata) }, 201)
})

// GET /api/orchestrator/rooms/:id/presence
app.get('/rooms/:id/presence', async (c) => {
  const user = c.get('user')
  const roomId = c.req.param('id')
  const ok = await ensureRoom(c.env.DB, user.id, roomId)
  if (!ok) return c.json({ error: 'Room not found' }, 404)
  const presence = await q.listOrchestratorPresence(c.env.DB, user.id, roomId)
  return c.json(presence.map(p => ({ ...p, metadata: q.parseJson(p.metadata) })))
})

export { app as orchestratorRoutes }

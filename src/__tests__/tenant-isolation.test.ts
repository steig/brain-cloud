import { describe, it, expect, beforeAll } from 'vitest'
import { SELF } from 'cloudflare:test'
import { applyMigrations, getTestDb, seedUserWithHashedKey } from './helpers'

// ─── Two isolated test users ─────────────────────────────────────────────────

const USER_A = {
  id: 'tenant-user-a',
  name: 'Alice Tenant',
  email: 'alice@tenant-test.com',
  api_key: 'tenant-key-alice-00000000',
} as const

const USER_B = {
  id: 'tenant-user-b',
  name: 'Bob Tenant',
  email: 'bob@tenant-test.com',
  api_key: 'tenant-key-bob-00000000',
} as const

/** Build an authenticated Request for a specific user */
function userFetch(apiKey: string, path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

/** Send a JSON-RPC MCP tools/call as a specific user */
function mcpToolCall(apiKey: string, name: string, args: Record<string, unknown>) {
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  })
}

function parseMcpResult(result: { content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse(result.content[0].text)
}

// ─── Seeded record IDs ──────────────────────────────────────────────────────

let userAThoughtId: string
let userBThoughtId: string
let userADecisionId: string
let userBDecisionId: string
let userASessionId: string
let userBSessionId: string
let userASentimentId: string
let userBSentimentId: string
let userAHandoffId: string
let userBHandoffId: string

describe('Tenant Isolation', () => {
  beforeAll(async () => {
    const db = getTestDb()
    await applyMigrations(db)

    // Seed both users with hashed API keys
    for (const u of [USER_A, USER_B]) {
      await seedUserWithHashedKey(db, u)
    }

    // ── Seed thoughts ──
    userAThoughtId = crypto.randomUUID()
    userBThoughtId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO thoughts (id, user_id, type, content, tags, context, created_at)
       VALUES (?, ?, 'note', 'Alice private thought', '["alice"]', '{}', datetime('now'))`
    ).bind(userAThoughtId, USER_A.id).run()
    await db.prepare(
      `INSERT INTO thoughts (id, user_id, type, content, tags, context, created_at)
       VALUES (?, ?, 'note', 'Bob private thought', '["bob"]', '{}', datetime('now'))`
    ).bind(userBThoughtId, USER_B.id).run()

    // ── Seed decisions ──
    userADecisionId = crypto.randomUUID()
    userBDecisionId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO decisions (id, user_id, title, chosen, rationale, tags, created_at)
       VALUES (?, ?, 'Alice decision', 'A', 'Because Alice', '["alice"]', datetime('now'))`
    ).bind(userADecisionId, USER_A.id).run()
    await db.prepare(
      `INSERT INTO decisions (id, user_id, title, chosen, rationale, tags, created_at)
       VALUES (?, ?, 'Bob decision', 'B', 'Because Bob', '["bob"]', datetime('now'))`
    ).bind(userBDecisionId, USER_B.id).run()

    // ── Seed sessions ──
    userASessionId = crypto.randomUUID()
    userBSessionId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO sessions (id, user_id, started_at, mood_start, goals)
       VALUES (?, ?, datetime('now'), 'focused', '["alice goal"]')`
    ).bind(userASessionId, USER_A.id).run()
    await db.prepare(
      `INSERT INTO sessions (id, user_id, started_at, mood_start, goals)
       VALUES (?, ?, datetime('now'), 'exploratory', '["bob goal"]')`
    ).bind(userBSessionId, USER_B.id).run()

    // ── Seed sentiment ──
    userASentimentId = crypto.randomUUID()
    userBSentimentId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO sentiment (id, user_id, target_type, target_name, feeling, intensity, reason, created_at)
       VALUES (?, ?, 'tool', 'alice-tool', 'satisfied', 4, 'Alice reason', datetime('now'))`
    ).bind(userASentimentId, USER_A.id).run()
    await db.prepare(
      `INSERT INTO sentiment (id, user_id, target_type, target_name, feeling, intensity, reason, created_at)
       VALUES (?, ?, 'tool', 'bob-tool', 'frustrated', 3, 'Bob reason', datetime('now'))`
    ).bind(userBSentimentId, USER_B.id).run()

    // ── Seed handoffs ──
    userAHandoffId = crypto.randomUUID()
    userBHandoffId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO handoffs (id, user_id, to_project, message, handoff_type, priority, status, created_at)
       VALUES (?, ?, 'alice-proj', 'Alice handoff', 'context', 'medium', 'pending', datetime('now'))`
    ).bind(userAHandoffId, USER_A.id).run()
    await db.prepare(
      `INSERT INTO handoffs (id, user_id, to_project, message, handoff_type, priority, status, created_at)
       VALUES (?, ?, 'bob-proj', 'Bob handoff', 'context', 'medium', 'pending', datetime('now'))`
    ).bind(userBHandoffId, USER_B.id).run()
  })

  // ─── GET list endpoints: user A only sees own data ────────────────────────

  describe('GET list isolation', () => {
    it('GET /api/thoughts — user A only sees own thoughts', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, '/api/thoughts'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string; content: string }>
      expect(body.some(t => t.id === userAThoughtId)).toBe(true)
      expect(body.some(t => t.id === userBThoughtId)).toBe(false)
      expect(body.every(t => !t.content.includes('Bob'))).toBe(true)
    })

    it('GET /api/thoughts — user B only sees own thoughts', async () => {
      const res = await SELF.fetch(userFetch(USER_B.api_key, '/api/thoughts'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string; content: string }>
      expect(body.some(t => t.id === userBThoughtId)).toBe(true)
      expect(body.some(t => t.id === userAThoughtId)).toBe(false)
    })

    it('GET /api/decisions — user A only sees own decisions', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, '/api/decisions'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string; title: string }>
      expect(body.some(d => d.id === userADecisionId)).toBe(true)
      expect(body.some(d => d.id === userBDecisionId)).toBe(false)
    })

    it('GET /api/sessions — user A only sees own sessions', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, '/api/sessions'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string }>
      expect(body.some(s => s.id === userASessionId)).toBe(true)
      expect(body.some(s => s.id === userBSessionId)).toBe(false)
    })

    it('GET /api/sentiment — user A only sees own sentiment', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, '/api/sentiment'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string }>
      expect(body.some(s => s.id === userASentimentId)).toBe(true)
      expect(body.some(s => s.id === userBSentimentId)).toBe(false)
    })

    it('GET /api/handoffs — user A only sees own handoffs', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, '/api/handoffs'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string }>
      expect(body.some(h => h.id === userAHandoffId)).toBe(true)
      expect(body.some(h => h.id === userBHandoffId)).toBe(false)
    })
  })

  // ─── GET by ID: cross-tenant returns empty / 404 ──────────────────────────

  describe('GET by ID isolation', () => {
    it('user A requesting user B thought ID returns empty result', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, `/api/thoughts?id=eq.${userBThoughtId}`))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<unknown>
      expect(body).toHaveLength(0)
    })

    it('user A requesting user B decision ID returns empty result', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, `/api/decisions?id=eq.${userBDecisionId}`))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<unknown>
      expect(body).toHaveLength(0)
    })

    it('user B requesting user A thought ID returns empty result', async () => {
      const res = await SELF.fetch(userFetch(USER_B.api_key, `/api/thoughts?id=eq.${userAThoughtId}`))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<unknown>
      expect(body).toHaveLength(0)
    })
  })

  // ─── PATCH/DELETE: cross-tenant mutation is no-op ─────────────────────────

  describe('cross-tenant mutation isolation', () => {
    it('user A cannot PATCH user B thought', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, `/api/thoughts?id=eq.${userBThoughtId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'hacked by Alice' }),
      }))
      // Should succeed silently (204) but not modify Bob's data
      expect(res.status).toBe(204)

      // Verify Bob's thought is unchanged
      const check = await SELF.fetch(userFetch(USER_B.api_key, `/api/thoughts?id=eq.${userBThoughtId}`))
      const body = await check.json() as Array<{ content: string }>
      expect(body).toHaveLength(1)
      expect(body[0].content).toBe('Bob private thought')
    })

    it('user A cannot DELETE user B thought', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, `/api/thoughts?id=eq.${userBThoughtId}`, {
        method: 'DELETE',
      }))
      expect(res.status).toBe(204)

      // Verify Bob's thought still exists
      const check = await SELF.fetch(userFetch(USER_B.api_key, `/api/thoughts?id=eq.${userBThoughtId}`))
      const body = await check.json() as Array<{ id: string }>
      expect(body).toHaveLength(1)
      expect(body[0].id).toBe(userBThoughtId)
    })

    it('user A cannot PATCH user B decision', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, `/api/decisions?id=eq.${userBDecisionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ outcome: 'hacked by Alice' }),
      }))
      expect(res.status).toBe(204)

      // Verify Bob's decision is unchanged
      const check = await SELF.fetch(userFetch(USER_B.api_key, `/api/decisions?id=eq.${userBDecisionId}`))
      const body = await check.json() as Array<{ title: string }>
      expect(body).toHaveLength(1)
      expect(body[0].title).toBe('Bob decision')
    })

    it('user A cannot DELETE user B decision', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, `/api/decisions?id=eq.${userBDecisionId}`, {
        method: 'DELETE',
      }))
      expect(res.status).toBe(204)

      // Verify Bob's decision still exists
      const check = await SELF.fetch(userFetch(USER_B.api_key, `/api/decisions?id=eq.${userBDecisionId}`))
      const body = await check.json() as Array<{ id: string }>
      expect(body).toHaveLength(1)
    })

    it('user A cannot claim user B handoff', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, `/api/handoffs/${userBHandoffId}/claim`, {
        method: 'PATCH',
        body: JSON.stringify({ note: 'stolen by Alice' }),
      }))
      expect(res.status).toBe(404)
    })
  })

  // ─── MCP tool isolation ───────────────────────────────────────────────────

  describe('MCP tool isolation', () => {
    it('brain_search scoped to authenticated user', async () => {
      const res = await SELF.fetch(mcpToolCall(USER_A.api_key, 'brain_search', {
        query: 'private thought',
        limit: 50,
      }))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseMcpResult(body.result) as { results: Array<{ content: string; id: string }> }
      // Alice should find her thought
      const hasAlice = result.results.some(r => r.content?.includes('Alice'))
      expect(hasAlice).toBe(true)
      // Alice must NOT find Bob's thought
      const hasBob = result.results.some(r => r.content?.includes('Bob'))
      expect(hasBob).toBe(false)
    })

    it('brain_recall scoped to authenticated user', async () => {
      const res = await SELF.fetch(mcpToolCall(USER_A.api_key, 'brain_recall', {
        query: 'decision',
        limit: 50,
      }))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseMcpResult(body.result) as { memories: Array<{ title?: string; content?: string }> }
      // Should only contain Alice's data
      const hasBob = result.memories.some(
        m => (m.title?.includes('Bob') || m.content?.includes('Bob'))
      )
      expect(hasBob).toBe(false)
    })

    it('brain_timeline scoped to authenticated user', async () => {
      const res = await SELF.fetch(mcpToolCall(USER_A.api_key, 'brain_timeline', {
        days: 30,
        limit: 100,
      }))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseMcpResult(body.result) as { entries: Array<{ content?: string; title?: string; user_id?: string }> }
      // No entry should belong to Bob
      const hasBob = result.entries.some(
        e => e.user_id === USER_B.id || e.content?.includes('Bob') || e.title?.includes('Bob')
      )
      expect(hasBob).toBe(false)
    })

    it('brain_search with user B returns only Bob data', async () => {
      const res = await SELF.fetch(mcpToolCall(USER_B.api_key, 'brain_search', {
        query: 'private thought',
        limit: 50,
      }))
      expect(res.status).toBe(200)
      const body = await res.json() as { result: { content: Array<{ type: string; text: string }> } }
      const result = parseMcpResult(body.result) as { results: Array<{ content: string }> }
      const hasBob = result.results.some(r => r.content?.includes('Bob'))
      expect(hasBob).toBe(true)
      const hasAlice = result.results.some(r => r.content?.includes('Alice'))
      expect(hasAlice).toBe(false)
    })
  })

  // ─── Export isolation ─────────────────────────────────────────────────────

  describe('export isolation', () => {
    it('GET /api/export returns only authenticated user data', async () => {
      const res = await SELF.fetch(userFetch(USER_A.api_key, '/api/export?type=all&format=json'))
      expect(res.status).toBe(200)
      const body = await res.json() as {
        thoughts: Array<{ id: string; content: string }>
        decisions: Array<{ id: string; title: string }>
        sessions: Array<{ id: string }>
        sentiment: Array<{ id: string }>
      }

      // Thoughts: only Alice's
      expect(body.thoughts.some(t => t.id === userAThoughtId)).toBe(true)
      expect(body.thoughts.some(t => t.id === userBThoughtId)).toBe(false)

      // Decisions: only Alice's
      expect(body.decisions.some(d => d.id === userADecisionId)).toBe(true)
      expect(body.decisions.some(d => d.id === userBDecisionId)).toBe(false)

      // Sessions: only Alice's
      expect(body.sessions.some(s => s.id === userASessionId)).toBe(true)
      expect(body.sessions.some(s => s.id === userBSessionId)).toBe(false)

      // Sentiment: only Alice's
      expect(body.sentiment.some(s => s.id === userASentimentId)).toBe(true)
      expect(body.sentiment.some(s => s.id === userBSentimentId)).toBe(false)
    })

    it('GET /api/export for user B returns only Bob data', async () => {
      const res = await SELF.fetch(userFetch(USER_B.api_key, '/api/export?type=thoughts&format=json'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string }>
      expect(body.some(t => t.id === userBThoughtId)).toBe(true)
      expect(body.some(t => t.id === userAThoughtId)).toBe(false)
    })
  })

  // ─── Data created via API is also isolated ────────────────────────────────

  describe('API-created data isolation', () => {
    let apiCreatedThoughtId: string

    it('thought created by user A via API is invisible to user B', async () => {
      // User A creates a thought via the API
      const createRes = await SELF.fetch(userFetch(USER_A.api_key, '/api/thoughts', {
        method: 'POST',
        body: JSON.stringify({
          content: 'API-created Alice secret',
          type: 'note',
          tags: ['tenant-test'],
        }),
        headers: { Prefer: 'return=representation' },
      }))
      expect(createRes.status).toBe(201)
      const created = await createRes.json() as Array<{ id: string }>
      apiCreatedThoughtId = created[0].id

      // User B lists thoughts — must not see it
      const listRes = await SELF.fetch(userFetch(USER_B.api_key, '/api/thoughts'))
      const body = await listRes.json() as Array<{ id: string }>
      expect(body.some(t => t.id === apiCreatedThoughtId)).toBe(false)
    })

    it('decision created by user B via API is invisible to user A', async () => {
      const createRes = await SELF.fetch(userFetch(USER_B.api_key, '/api/decisions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Bob API decision',
          chosen: 'Secret B',
          rationale: 'Bob only',
        }),
        headers: { Prefer: 'return=representation' },
      }))
      expect(createRes.status).toBe(201)
      const created = await createRes.json() as Array<{ id: string }>

      const listRes = await SELF.fetch(userFetch(USER_A.api_key, '/api/decisions'))
      const body = await listRes.json() as Array<{ id: string }>
      expect(body.some(d => d.id === created[0].id)).toBe(false)
    })
  })

  // ─── Cross-user data creation does not leak ────────────────────────────────

  describe('created data does not leak across users', () => {
    it('handoff created by user A via API is invisible to user B', async () => {
      const createRes = await SELF.fetch(userFetch(USER_A.api_key, '/api/handoffs', {
        method: 'POST',
        body: JSON.stringify({
          to_project: 'isolation-test',
          message: 'Alice-only handoff',
          handoff_type: 'context',
          priority: 'low',
        }),
      }))
      expect(createRes.status).toBe(201)
      const created = await createRes.json() as { id: string }

      // User B must not see it
      const listRes = await SELF.fetch(userFetch(USER_B.api_key, '/api/handoffs'))
      const body = await listRes.json() as Array<{ id: string }>
      expect(body.some(h => h.id === created.id)).toBe(false)
    })
  })
})

import { describe, it, expect, beforeAll } from 'vitest'
import { SELF } from 'cloudflare:test'
import { applyMigrations, getTestDb, seedUserWithHashedKey } from './helpers'

// ─── Two isolated test users for export tests ────────────────────────────────

const EXPORT_USER_A = {
  id: 'export-user-a',
  name: 'Alice Export',
  email: 'alice@export-test.com',
  api_key: 'export-key-alice-00000000',
} as const

const EXPORT_USER_B = {
  id: 'export-user-b',
  name: 'Bob Export',
  email: 'bob@export-test.com',
  api_key: 'export-key-bob-00000000',
} as const

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

// ─── Seeded record IDs ──────────────────────────────────────────────────────

let userAThoughtId: string
let userBThoughtId: string
let userADecisionId: string
let oldThoughtId: string

describe('Data Export Endpoint', () => {
  beforeAll(async () => {
    const db = getTestDb()
    await applyMigrations(db)

    for (const u of [EXPORT_USER_A, EXPORT_USER_B]) {
      await seedUserWithHashedKey(db, u)
    }

    // ── Seed thoughts for user A ──
    userAThoughtId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO thoughts (id, user_id, type, content, tags, context, created_at)
       VALUES (?, ?, 'insight', 'Alice export thought', '["export-test"]', '{}', datetime('now'))`
    ).bind(userAThoughtId, EXPORT_USER_A.id).run()

    // Thought with CSV-tricky content (commas, quotes, newlines)
    const trickyId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO thoughts (id, user_id, type, content, tags, context, created_at)
       VALUES (?, ?, 'note', ?, '["csv-test"]', '{}', datetime('now'))`
    ).bind(trickyId, EXPORT_USER_A.id, 'has "quotes", commas,\nand newlines').run()

    // Old thought for date range filtering (90+ days ago)
    oldThoughtId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO thoughts (id, user_id, type, content, tags, context, created_at)
       VALUES (?, ?, 'note', 'Old thought from long ago', '["old"]', '{}', datetime('now', '-120 days'))`
    ).bind(oldThoughtId, EXPORT_USER_A.id).run()

    // ── Seed thought for user B ──
    userBThoughtId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO thoughts (id, user_id, type, content, tags, context, created_at)
       VALUES (?, ?, 'note', 'Bob secret thought', '["bob"]', '{}', datetime('now'))`
    ).bind(userBThoughtId, EXPORT_USER_B.id).run()

    // ── Seed decision for user A ──
    userADecisionId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO decisions (id, user_id, title, chosen, rationale, tags, created_at)
       VALUES (?, ?, 'Alice decision', 'Option A', 'Good reason', '["export"]', datetime('now'))`
    ).bind(userADecisionId, EXPORT_USER_A.id).run()
  })

  // ─── JSON export ──────────────────────────────────────────────────────────

  describe('JSON export', () => {
    it('exports all types as JSON with expected top-level keys', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=all&format=json'))
      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, unknown[]>
      expect(body).toHaveProperty('thoughts')
      expect(body).toHaveProperty('decisions')
      expect(body).toHaveProperty('sessions')
      expect(body).toHaveProperty('sentiment')
      expect(body).toHaveProperty('handoffs')
      expect(body).toHaveProperty('dx_events')
      expect(Array.isArray(body.thoughts)).toBe(true)
    })

    it('exports single type as JSON array (not wrapped in object)', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=thoughts&format=json'))
      expect(res.status).toBe(200)
      const body = await res.json() as unknown[]
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThanOrEqual(1)
    })

    it('thought records contain all expected GDPR-relevant fields', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=thoughts&format=json'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<Record<string, unknown>>
      const thought = body.find(t => t.id === userAThoughtId)
      expect(thought).toBeDefined()
      // Verify all exported fields are present
      expect(thought).toHaveProperty('id')
      expect(thought).toHaveProperty('type')
      expect(thought).toHaveProperty('content')
      expect(thought).toHaveProperty('tags')
      expect(thought).toHaveProperty('context')
      expect(thought).toHaveProperty('created_at')
      // user_id should NOT be in export (it's filtered by the query, not selected)
      expect(thought).not.toHaveProperty('user_id')
    })

    it('decision records contain all expected fields', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=decisions&format=json'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<Record<string, unknown>>
      const decision = body.find(d => d.id === userADecisionId)
      expect(decision).toBeDefined()
      expect(decision).toHaveProperty('id')
      expect(decision).toHaveProperty('title')
      expect(decision).toHaveProperty('chosen')
      expect(decision).toHaveProperty('rationale')
      expect(decision).toHaveProperty('tags')
      expect(decision).toHaveProperty('created_at')
    })

    it('sets Content-Disposition header for download', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=thoughts&format=json'))
      const disposition = res.headers.get('Content-Disposition')
      expect(disposition).toMatch(/attachment; filename="thoughts-.*\.json"/)
    })
  })

  // ─── CSV export ───────────────────────────────────────────────────────────

  describe('CSV export', () => {
    it('exports thoughts as valid CSV with header row', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=thoughts&format=csv'))
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/csv')
      const csv = await res.text()
      const lines = csv.split('\n')
      // First line should be header
      expect(lines[0]).toContain('id')
      expect(lines[0]).toContain('content')
      expect(lines[0]).toContain('created_at')
      // Should have data rows
      expect(lines.length).toBeGreaterThan(1)
    })

    it('properly escapes commas, quotes, and newlines in CSV', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=thoughts&format=csv'))
      const csv = await res.text()
      // The tricky content 'has "quotes", commas,\nand newlines' should be
      // wrapped in quotes with internal quotes doubled
      expect(csv).toContain('""quotes""')
      // The field containing commas/newlines should be quoted
      expect(csv).toContain('"has ""quotes"", commas,')
    })

    it('sets Content-Disposition header for CSV download', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=thoughts&format=csv'))
      const disposition = res.headers.get('Content-Disposition')
      expect(disposition).toMatch(/attachment; filename="thoughts-.*\.csv"/)
    })

    it('exports all types as CSV with section headers', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=all&format=csv'))
      const csv = await res.text()
      expect(csv).toContain('# thoughts')
      expect(csv).toContain('# decisions')
      expect(csv).toContain('# sessions')
    })
  })

  // ─── User scoping (GDPR compliance) ───────────────────────────────────────

  describe('user scoping (tenant isolation)', () => {
    it('user A export does not contain user B thoughts', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=thoughts&format=json'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string; content: string }>
      expect(body.some(t => t.id === userAThoughtId)).toBe(true)
      expect(body.some(t => t.id === userBThoughtId)).toBe(false)
      expect(body.every(t => !t.content.includes('Bob secret'))).toBe(true)
    })

    it('user B export does not contain user A thoughts', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_B.api_key, '/api/export?type=thoughts&format=json'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string; content: string }>
      expect(body.some(t => t.id === userBThoughtId)).toBe(true)
      expect(body.some(t => t.id === userAThoughtId)).toBe(false)
    })

    it('full export (type=all) is scoped to authenticated user only', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=all&format=json'))
      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, Array<{ id: string }>>
      // Check thoughts and decisions
      expect(body.thoughts.some(t => t.id === userBThoughtId)).toBe(false)
      expect(body.thoughts.some(t => t.id === userAThoughtId)).toBe(true)
      expect(body.decisions.some(d => d.id === userADecisionId)).toBe(true)
    })

    it('CSV export is also scoped to authenticated user', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=thoughts&format=csv'))
      const csv = await res.text()
      expect(csv).toContain('Alice export thought')
      expect(csv).not.toContain('Bob secret thought')
    })
  })

  // ─── Date range filtering ─────────────────────────────────────────────────

  describe('date range filtering', () => {
    it('range=7d excludes old records', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=thoughts&format=json&range=7d'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string }>
      // Recent thoughts should be present
      expect(body.some(t => t.id === userAThoughtId)).toBe(true)
      // Old thought (120 days ago) should be excluded
      expect(body.some(t => t.id === oldThoughtId)).toBe(false)
    })

    it('range=30d excludes old records', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=thoughts&format=json&range=30d'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string }>
      expect(body.some(t => t.id === userAThoughtId)).toBe(true)
      expect(body.some(t => t.id === oldThoughtId)).toBe(false)
    })

    it('range=all includes old records', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=thoughts&format=json&range=all'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string }>
      expect(body.some(t => t.id === userAThoughtId)).toBe(true)
      expect(body.some(t => t.id === oldThoughtId)).toBe(true)
    })
  })

  // ─── Input validation ─────────────────────────────────────────────────────

  describe('input validation', () => {
    it('rejects invalid format', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?format=xml'))
      expect(res.status).toBe(400)
      const body = await res.json() as { error: string }
      expect(body.error).toContain('Invalid format')
    })

    it('rejects invalid type', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?type=passwords'))
      expect(res.status).toBe(400)
      const body = await res.json() as { error: string }
      expect(body.error).toContain('Invalid type')
    })

    it('rejects invalid range', async () => {
      const res = await SELF.fetch(userFetch(EXPORT_USER_A.api_key, '/api/export?range=999d'))
      expect(res.status).toBe(400)
      const body = await res.json() as { error: string }
      expect(body.error).toContain('Invalid range')
    })

    it('rejects unauthenticated requests', async () => {
      const res = await SELF.fetch('http://localhost/api/export')
      expect(res.status).toBe(401)
    })
  })
})

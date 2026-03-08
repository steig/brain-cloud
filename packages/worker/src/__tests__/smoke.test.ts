import { describe, it, expect, beforeAll } from 'vitest'
import { SELF } from 'cloudflare:test'
import { applyMigrations, seedTestUser, authFetch, getTestDb } from './helpers'

describe('Brain Cloud API smoke tests', () => {
  beforeAll(async () => {
    const db = getTestDb()
    await applyMigrations(db)
    await seedTestUser(db)
  })

  describe('health', () => {
    it('GET /health returns ok', async () => {
      const res = await SELF.fetch('http://localhost/health')
      expect(res.status).toBe(200)
      const body = await res.json() as { status: string }
      expect(body.status).toBe('ok')
    })
  })

  describe('auth', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await SELF.fetch('http://localhost/api/thoughts')
      expect(res.status).toBe(401)
    })
  })

  describe('thoughts', () => {
    let thoughtId: string

    it('POST /api/thoughts creates a thought', async () => {
      const res = await SELF.fetch(authFetch('/api/thoughts', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test thought from vitest',
          type: 'note',
          tags: ['test'],
        }),
        headers: { Prefer: 'return=representation' },
      }))
      expect(res.status).toBe(201)
      const body = await res.json() as Array<{ id: string; content: string; tags: string[] }>
      expect(body).toHaveLength(1)
      expect(body[0].content).toBe('Test thought from vitest')
      expect(body[0].tags).toContain('test')
      thoughtId = body[0].id
    })

    it('GET /api/thoughts lists thoughts', async () => {
      // Insert directly to ensure data exists
      const db = getTestDb()
      const id = crypto.randomUUID()
      await db.prepare(
        `INSERT INTO thoughts (id, user_id, type, content, tags, context, created_at)
         VALUES (?, ?, 'note', 'direct insert', '[]', '{}', datetime('now'))`
      ).bind(id, 'test-user-001').run()

      const res = await SELF.fetch(authFetch('/api/thoughts'))
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string }>
      expect(body.length).toBeGreaterThanOrEqual(1)
    })

    it('DELETE /api/thoughts soft-deletes', async () => {
      const res = await SELF.fetch(authFetch(`/api/thoughts?id=eq.${thoughtId}`, {
        method: 'DELETE',
      }))
      expect(res.status).toBe(204)
    })
  })

  describe('decisions', () => {
    it('POST /api/decisions creates a decision', async () => {
      const res = await SELF.fetch(authFetch('/api/decisions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test decision',
          chosen: 'Option A',
          rationale: 'Because tests',
        }),
        headers: { Prefer: 'return=representation' },
      }))
      expect(res.status).toBe(201)
      const body = await res.json() as Array<{ title: string }>
      expect(body[0].title).toBe('Test decision')
    })
  })

  describe('sessions', () => {
    it('POST /api/sessions creates a session', async () => {
      const res = await SELF.fetch(authFetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          mood_start: 'focused',
          goals: ['test the API'],
        }),
        headers: { Prefer: 'return=representation' },
      }))
      expect(res.status).toBe(201)
      const body = await res.json() as Array<{ id: string }>
      expect(body[0].id).toBeDefined()
    })
  })

  describe('sentiment', () => {
    it('POST /api/sentiment creates a sentiment entry', async () => {
      const res = await SELF.fetch(authFetch('/api/sentiment', {
        method: 'POST',
        body: JSON.stringify({
          target_type: 'tool',
          target_name: 'vitest',
          feeling: 'satisfied',
          intensity: 4,
          reason: 'Tests are working',
        }),
        headers: { Prefer: 'return=representation' },
      }))
      expect(res.status).toBe(201)
    })
  })

  describe('handoffs', () => {
    it('POST /api/handoffs creates a handoff', async () => {
      const res = await SELF.fetch(authFetch('/api/handoffs', {
        method: 'POST',
        body: JSON.stringify({
          to_project: 'test-project',
          message: 'Test handoff',
          handoff_type: 'context',
          priority: 'medium',
        }),
        headers: { Prefer: 'return=representation' },
      }))
      expect(res.status).toBe(201)
    })
  })
})

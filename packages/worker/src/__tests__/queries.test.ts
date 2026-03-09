import { describe, it, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import { applyMigrations, seedTestUser, TEST_USER } from './helpers'
import * as q from '../db/queries'

// findUserByKeyHash has a fire-and-forget db.run() to update last_used_at.
// The cloudflare test pool requires all D1 writes to complete within the test.
// This helper flushes pending writes by doing a trivial DB read.
async function flushDb() {
  await env.DB.prepare('SELECT 1').first()
}

describe('db/queries', () => {
  beforeAll(async () => {
    await applyMigrations(env.DB)
    await seedTestUser(env.DB)
  })

  // ─── Machines ──────────────────────────────────────────────────

  describe('upsertMachine', () => {
    it('creates a new machine and returns id', async () => {
      const id = await q.upsertMachine(env.DB, TEST_USER.id, 'test-host', 'linux', 'x64')
      expect(id).toBeTruthy()
      expect(typeof id).toBe('string')
    })

    it('returns same id on upsert with same hostname', async () => {
      const id1 = await q.upsertMachine(env.DB, TEST_USER.id, 'upsert-host', 'linux')
      const id2 = await q.upsertMachine(env.DB, TEST_USER.id, 'upsert-host', 'darwin')
      expect(id1).toBe(id2)
    })

    it('merges metadata on upsert', async () => {
      await q.upsertMachine(env.DB, TEST_USER.id, 'meta-host', 'linux', 'x64', { a: 1 })
      await q.upsertMachine(env.DB, TEST_USER.id, 'meta-host', 'linux', 'x64', { b: 2 })
      const row = await env.DB.prepare(
        'SELECT metadata FROM machines WHERE user_id = ? AND hostname = ?'
      ).bind(TEST_USER.id, 'meta-host').first<{ metadata: string }>()
      const meta = JSON.parse(row!.metadata)
      expect(meta.a).toBe(1)
      expect(meta.b).toBe(2)
    })
  })

  // ─── Projects ──────────────────────────────────────────────────

  describe('upsertProject', () => {
    it('creates a new project and returns id', async () => {
      const id = await q.upsertProject(env.DB, TEST_USER.id, 'test-project', 'https://github.com/test')
      expect(id).toBeTruthy()
    })

    it('returns same id on upsert with same name for same user', async () => {
      const id1 = await q.upsertProject(env.DB, TEST_USER.id, 'dup-project')
      const id2 = await q.upsertProject(env.DB, TEST_USER.id, 'dup-project', 'https://new-url')
      expect(id1).toBe(id2)
    })
  })

  // ─── Thoughts ──────────────────────────────────────────────────

  describe('thoughts', () => {
    it('createThought returns a thought row', async () => {
      const t = await q.createThought(env.DB, TEST_USER.id, {
        content: 'test thought',
        type: 'note',
        tags: ['test', 'unit'],
      })
      expect(t.id).toBeTruthy()
      expect(t.content).toBe('test thought')
      expect(t.type).toBe('note')
    })

    it('listThoughts returns created thoughts', async () => {
      const t = await q.createThought(env.DB, TEST_USER.id, { content: 'list-me' })
      const list = await q.listThoughts(env.DB, TEST_USER.id)
      expect(list.length).toBeGreaterThanOrEqual(1)
      expect(list.some(r => r.id === t.id)).toBe(true)
    })

    it('listThoughts filters by type', async () => {
      await q.createThought(env.DB, TEST_USER.id, { content: 'idea content', type: 'idea' })
      const ideas = await q.listThoughts(env.DB, TEST_USER.id, { type: 'idea' })
      expect(ideas.every(t => t.type === 'idea')).toBe(true)
      expect(ideas.length).toBeGreaterThanOrEqual(1)
    })

    it('listThoughts filters by tags', async () => {
      await q.createThought(env.DB, TEST_USER.id, {
        content: 'tagged thought',
        tags: ['special-tag'],
      })
      const results = await q.listThoughts(env.DB, TEST_USER.id, {
        tagsContain: ['special-tag'],
      })
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results.every(t => {
        const tags = JSON.parse(t.tags || '[]')
        return tags.includes('special-tag')
      })).toBe(true)
    })

    it('listThoughts excludes types with typeNotIn', async () => {
      await q.createThought(env.DB, TEST_USER.id, { content: 'note for filter', type: 'note' })
      await q.createThought(env.DB, TEST_USER.id, { content: 'idea for filter', type: 'idea' })
      const results = await q.listThoughts(env.DB, TEST_USER.id, { typeNotIn: ['idea'] })
      expect(results.every(t => t.type !== 'idea')).toBe(true)
    })

    it('updateThought modifies content', async () => {
      const t = await q.createThought(env.DB, TEST_USER.id, { content: 'original' })
      await q.updateThought(env.DB, TEST_USER.id, t.id, { content: 'updated' })
      const row = await env.DB.prepare('SELECT content FROM thoughts WHERE id = ?')
        .bind(t.id).first<{ content: string }>()
      expect(row!.content).toBe('updated')
    })

    it('deleteThought soft-deletes (sets deleted_at)', async () => {
      const t = await q.createThought(env.DB, TEST_USER.id, { content: 'to delete' })
      await q.deleteThought(env.DB, TEST_USER.id, t.id)
      const row = await env.DB.prepare('SELECT deleted_at FROM thoughts WHERE id = ?')
        .bind(t.id).first<{ deleted_at: string | null }>()
      expect(row!.deleted_at).not.toBeNull()
    })

    it('deleted thoughts are excluded from listThoughts', async () => {
      const t = await q.createThought(env.DB, TEST_USER.id, { content: 'will vanish' })
      await q.deleteThought(env.DB, TEST_USER.id, t.id)
      const list = await q.listThoughts(env.DB, TEST_USER.id)
      expect(list.some(r => r.id === t.id)).toBe(false)
    })

    it('countThoughts returns correct count', async () => {
      await q.createThought(env.DB, TEST_USER.id, { content: 'count me' })
      const count = await q.countThoughts(env.DB, TEST_USER.id)
      expect(count).toBeGreaterThanOrEqual(1)
    })
  })

  // ─── Decisions ─────────────────────────────────────────────────

  describe('decisions', () => {
    it('createDecision with options array', async () => {
      const d = await q.createDecision(env.DB, TEST_USER.id, {
        title: 'Pick a DB',
        chosen: 'D1',
        rationale: 'Cloudflare native',
        options: [
          { option: 'D1', pros: ['native'], cons: ['new'] },
          { option: 'Postgres', pros: ['mature'], cons: ['external'] },
        ],
        tags: ['architecture'],
      })
      expect(d.id).toBeTruthy()
      expect(d.title).toBe('Pick a DB')
      const opts = JSON.parse(d.options || '[]')
      expect(opts).toHaveLength(2)
    })

    it('listDecisions returns created decisions', async () => {
      const d = await q.createDecision(env.DB, TEST_USER.id, {
        title: 'listable', chosen: 'x', rationale: 'y',
      })
      const list = await q.listDecisions(env.DB, TEST_USER.id)
      expect(list.length).toBeGreaterThanOrEqual(1)
      expect(list.some(r => r.id === d.id)).toBe(true)
    })

    it('updateDecision sets outcome', async () => {
      const d = await q.createDecision(env.DB, TEST_USER.id, {
        title: 'to update', chosen: 'a', rationale: 'b',
      })
      await q.updateDecision(env.DB, TEST_USER.id, d.id, {
        outcome: 'Works great',
        tags: ['architecture', 'validated'],
      })
      const row = await env.DB.prepare('SELECT outcome, tags FROM decisions WHERE id = ?')
        .bind(d.id).first<{ outcome: string; tags: string }>()
      expect(row!.outcome).toBe('Works great')
      expect(JSON.parse(row!.tags)).toContain('validated')
    })

    it('deleteDecision soft-deletes', async () => {
      const d = await q.createDecision(env.DB, TEST_USER.id, { title: 'temp', chosen: 'x', rationale: 'y' })
      await q.deleteDecision(env.DB, TEST_USER.id, d.id)
      const row = await env.DB.prepare('SELECT deleted_at FROM decisions WHERE id = ?')
        .bind(d.id).first<{ deleted_at: string | null }>()
      expect(row!.deleted_at).not.toBeNull()
    })

    it('deleted decisions excluded from listDecisions', async () => {
      const d = await q.createDecision(env.DB, TEST_USER.id, { title: 'gone', chosen: 'x', rationale: 'y' })
      await q.deleteDecision(env.DB, TEST_USER.id, d.id)
      const list = await q.listDecisions(env.DB, TEST_USER.id)
      expect(list.some(r => r.id === d.id)).toBe(false)
    })
  })

  // ─── Sessions ──────────────────────────────────────────────────

  describe('sessions', () => {
    it('createSession returns session row', async () => {
      const s = await q.createSession(env.DB, TEST_USER.id, {
        mood_start: 'focused',
        goals: ['write tests'],
      })
      expect(s.id).toBeTruthy()
      expect(s.mood_start).toBe('focused')
      expect(s.ended_at).toBeNull()
    })

    it('updateSession ends the session', async () => {
      const s = await q.createSession(env.DB, TEST_USER.id, { mood_start: 'calm' })
      const updated = await q.updateSession(env.DB, TEST_USER.id, s.id, {
        ended_at: new Date().toISOString(),
        mood_end: 'productive',
        accomplishments: ['tests written'],
        summary: 'Wrote all the tests',
      })
      expect(updated).not.toBeNull()
      expect(updated!.mood_end).toBe('productive')
      expect(updated!.summary).toBe('Wrote all the tests')
    })

    it('listSessions returns sessions for user', async () => {
      const s = await q.createSession(env.DB, TEST_USER.id, { mood_start: 'happy' })
      const list = await q.listSessions(env.DB, TEST_USER.id)
      expect(list.length).toBeGreaterThanOrEqual(1)
      expect(list.some(r => r.id === s.id)).toBe(true)
    })

    it('getSession returns a single session', async () => {
      const s = await q.createSession(env.DB, TEST_USER.id, { mood_start: 'ok' })
      const found = await q.getSession(env.DB, TEST_USER.id, s.id)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(s.id)
    })

    it('getSession returns null for wrong user', async () => {
      const s = await q.createSession(env.DB, TEST_USER.id, { mood_start: 'ok' })
      const found = await q.getSession(env.DB, 'other-user', s.id)
      expect(found).toBeNull()
    })
  })

  // ─── Search ────────────────────────────────────────────────────

  describe('searchBrain', () => {
    it('finds thoughts by keyword', async () => {
      await q.createThought(env.DB, TEST_USER.id, { content: 'searchable needle in haystack' })
      const results = await q.searchBrain(env.DB, TEST_USER.id, 'needle')
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results.some(r => r.type === 'thought')).toBe(true)
    })

    it('finds decisions by keyword', async () => {
      await q.createDecision(env.DB, TEST_USER.id, {
        title: 'decision about acorn',
        chosen: 'found it',
        rationale: 'it was there',
      })
      const results = await q.searchBrain(env.DB, TEST_USER.id, 'acorn')
      expect(results.some(r => r.type === 'decision')).toBe(true)
    })

    it('returns empty for no match', async () => {
      const results = await q.searchBrain(env.DB, TEST_USER.id, 'xyznonexistent999')
      expect(results).toHaveLength(0)
    })

    it('respects limit', async () => {
      await q.createThought(env.DB, TEST_USER.id, { content: 'limit-test-alpha' })
      await q.createThought(env.DB, TEST_USER.id, { content: 'limit-test-alpha again' })
      const results = await q.searchBrain(env.DB, TEST_USER.id, 'limit-test-alpha', 1)
      expect(results.length).toBeLessThanOrEqual(1)
    })
  })

  // ─── Timeline ──────────────────────────────────────────────────

  describe('getTimeline', () => {
    it('returns entries within date range', async () => {
      await q.createThought(env.DB, TEST_USER.id, { content: 'timeline thought' })
      const now = new Date()
      const from = new Date(now.getTime() - 86400000).toISOString()
      const to = new Date(now.getTime() + 86400000).toISOString()
      const timeline = await q.getTimeline(env.DB, TEST_USER.id, from, to)
      expect(timeline.length).toBeGreaterThanOrEqual(1)
    })

    it('returns empty for future date range', async () => {
      const future = new Date(Date.now() + 365 * 86400000)
      const from = future.toISOString()
      const to = new Date(future.getTime() + 86400000).toISOString()
      const timeline = await q.getTimeline(env.DB, TEST_USER.id, from, to)
      expect(timeline).toHaveLength(0)
    })

    it('includes thoughts, decisions, and sessions', async () => {
      await q.createThought(env.DB, TEST_USER.id, { content: 'timeline-t' })
      await q.createDecision(env.DB, TEST_USER.id, { title: 'timeline-d', chosen: 'a', rationale: 'b' })
      await q.createSession(env.DB, TEST_USER.id, { mood_start: 'ok' })
      const from = new Date(Date.now() - 86400000).toISOString()
      const to = new Date(Date.now() + 86400000).toISOString()
      const timeline = await q.getTimeline(env.DB, TEST_USER.id, from, to)
      const types = new Set(timeline.map(e => e.type))
      expect(types.has('thought')).toBe(true)
      expect(types.has('decision')).toBe(true)
      expect(types.has('session')).toBe(true)
    })
  })

  // ─── API Keys ──────────────────────────────────────────────────

  describe('API keys', () => {
    it('createApiKey creates a key', async () => {
      const key = await q.createApiKey(env.DB, TEST_USER.id, 'test-key', 'hash-create', 'bc_test')
      expect(key.id).toBeTruthy()
      expect(key.name).toBe('test-key')
      expect(key.key_prefix).toBe('bc_test')
      expect(key.scope).toBe('write')
      expect(key.is_active).toBe(1)
    })

    it('listApiKeys returns keys for user', async () => {
      const hash = 'hash-list-' + Date.now()
      const key = await q.createApiKey(env.DB, TEST_USER.id, 'list-key-' + Date.now(), hash, 'bc_l')
      const keys = await q.listApiKeys(env.DB, TEST_USER.id)
      expect(keys.length).toBeGreaterThanOrEqual(1)
      expect(keys.some(k => k.id === key.id)).toBe(true)
    })

    it('findUserByKeyHash returns user for valid key', async () => {
      const hash = 'hash-find-' + Date.now()
      await q.createApiKey(env.DB, TEST_USER.id, 'find-key-' + Date.now(), hash, 'bc_f')
      const user = await q.findUserByKeyHash(env.DB, hash)
      await flushDb() // flush fire-and-forget last_used_at update
      expect(user).not.toBeNull()
      expect(user!.id).toBe(TEST_USER.id)
      expect(user!.key_scope).toBe('write')
    })

    it('findUserByKeyHash returns null for unknown hash', async () => {
      const user = await q.findUserByKeyHash(env.DB, 'nonexistent-hash')
      await flushDb()
      expect(user).toBeNull()
    })

    it('findUserByKeyHash marks expired keys', async () => {
      const hash = 'hash-expired-' + Date.now()
      await q.createApiKey(
        env.DB, TEST_USER.id, 'exp-key-' + Date.now(), hash, 'bc_exp',
        'write', '2020-01-01T00:00:00Z'
      )
      const user = await q.findUserByKeyHash(env.DB, hash)
      await flushDb()
      expect(user).not.toBeNull()
      expect(user!.expired).toBe(true)
    })

    it('revokeApiKey deactivates a key', async () => {
      const hash = 'hash-revoke-' + Date.now()
      const key = await q.createApiKey(env.DB, TEST_USER.id, 'rev-key-' + Date.now(), hash, 'bc_rev')
      await q.revokeApiKey(env.DB, TEST_USER.id, key.id)
      const user = await q.findUserByKeyHash(env.DB, hash)
      await flushDb()
      expect(user).toBeNull()
    })

    it('createApiKey with scope and expiry', async () => {
      const key = await q.createApiKey(
        env.DB, TEST_USER.id, 'read-key-' + Date.now(), 'hash-scope-' + Date.now(), 'bc_ro',
        'read', '2030-01-01T00:00:00Z'
      )
      expect(key.scope).toBe('read')
      expect(key.expires_at).toBe('2030-01-01T00:00:00Z')
    })
  })
})

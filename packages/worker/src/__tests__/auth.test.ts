import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { SELF } from 'cloudflare:test'
import { applyMigrations, seedTestUser, authFetch, getTestDb, TEST_USER } from './helpers'
import { hashToken } from '../auth/jwt'

describe('Auth integration tests', () => {
  beforeAll(async () => {
    const db = getTestDb()
    await applyMigrations(db)
    await seedTestUser(db)
  })

  // ─── API Key Auth (hashed) ───────────────────────────────────────

  describe('hashed API key auth', () => {
    it('valid API key returns 200', async () => {
      const res = await SELF.fetch(authFetch('/api/thoughts'))
      expect(res.status).toBe(200)
    })

    it('invalid API key returns 401', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          headers: { 'X-API-Key': 'wrong-key', 'Content-Type': 'application/json' },
        })
      )
      expect(res.status).toBe(401)
    })

    it('missing API key returns 401', async () => {
      const res = await SELF.fetch('http://localhost/api/thoughts')
      expect(res.status).toBe(401)
    })
  })

  // ─── Hashed Multi-Key Auth ───────────────────────────────────────

  describe('hashed multi-key auth', () => {
    const rawKey = 'brain_' + '0a'.repeat(32)
    let keyHash: string

    beforeAll(async () => {
      keyHash = await hashToken(rawKey)
      const db = getTestDb()
      await db.prepare(
        `INSERT OR IGNORE INTO api_keys (id, user_id, name, key_hash, key_prefix, scope, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 'write', 1, datetime('now'))`
      ).bind('hk-write-1', TEST_USER.id, 'write-key', keyHash, rawKey.slice(0, 12) + '...').run()
    })

    it('valid hashed key returns 200', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          headers: { 'X-API-Key': rawKey, 'Content-Type': 'application/json' },
        })
      )
      expect(res.status).toBe(200)
    })

    it('revoked hashed key returns 401', async () => {
      const revokedKey = 'brain_' + 'ff'.repeat(32)
      const revokedHash = await hashToken(revokedKey)
      const db = getTestDb()
      await db.prepare(
        `INSERT OR IGNORE INTO api_keys (id, user_id, name, key_hash, key_prefix, scope, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 'write', 0, datetime('now'))`
      ).bind('hk-revoked', TEST_USER.id, 'revoked-key', revokedHash, revokedKey.slice(0, 12) + '...').run()

      const res = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          headers: { 'X-API-Key': revokedKey, 'Content-Type': 'application/json' },
        })
      )
      expect(res.status).toBe(401)
    })
  })

  // ─── API Key Scoping ─────────────────────────────────────────────

  describe('API key scoping', () => {
    const readKey = 'brain_' + 'aa'.repeat(32)
    const writeKey = 'brain_' + 'bb'.repeat(32)
    const adminKey = 'brain_' + 'cc'.repeat(32)

    beforeAll(async () => {
      const db = getTestDb()
      for (const [id, name, key, scope] of [
        ['hk-read', 'read-key', readKey, 'read'],
        ['hk-write', 'write-key-2', writeKey, 'write'],
        ['hk-admin', 'admin-key', adminKey, 'admin'],
      ] as const) {
        const hash = await hashToken(key)
        await db.prepare(
          `INSERT OR IGNORE INTO api_keys (id, user_id, name, key_hash, key_prefix, scope, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`
        ).bind(id, TEST_USER.id, name, hash, key.slice(0, 12) + '...', scope).run()
      }
    })

    it('read-scope key can GET', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          headers: { 'X-API-Key': readKey, 'Content-Type': 'application/json' },
        })
      )
      expect(res.status).toBe(200)
    })

    it('read-scope key cannot POST', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          method: 'POST',
          headers: { 'X-API-Key': readKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'test', type: 'note' }),
        })
      )
      expect(res.status).toBe(403)
      const body = await res.json() as { error: string }
      expect(body.error).toContain('read')
    })

    it('write-scope key can GET', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          headers: { 'X-API-Key': writeKey, 'Content-Type': 'application/json' },
        })
      )
      expect(res.status).toBe(200)
    })

    it('write-scope key can POST', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          method: 'POST',
          headers: { 'X-API-Key': writeKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'write test', type: 'note' }),
        })
      )
      expect(res.status).toBe(201)
    })

    it('admin-scope key can do everything', async () => {
      const getRes = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          headers: { 'X-API-Key': adminKey, 'Content-Type': 'application/json' },
        })
      )
      expect(getRes.status).toBe(200)

      const postRes = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          method: 'POST',
          headers: { 'X-API-Key': adminKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'admin test', type: 'note' }),
        })
      )
      expect(postRes.status).toBe(201)
    })
  })

  // ─── API Key Expiry ──────────────────────────────────────────────

  describe('API key expiry', () => {
    it('expired key returns 401', async () => {
      const expiredKey = 'brain_' + 'dd'.repeat(32)
      const expiredHash = await hashToken(expiredKey)
      const db = getTestDb()
      // Set expires_at to yesterday
      const yesterday = new Date(Date.now() - 86400000).toISOString()
      await db.prepare(
        `INSERT OR IGNORE INTO api_keys (id, user_id, name, key_hash, key_prefix, scope, expires_at, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 'write', ?, 1, datetime('now'))`
      ).bind('hk-expired', TEST_USER.id, 'expired-key', expiredHash, expiredKey.slice(0, 12) + '...', yesterday).run()

      const res = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          headers: { 'X-API-Key': expiredKey, 'Content-Type': 'application/json' },
        })
      )
      expect(res.status).toBe(401)
    })

    it('non-expired key returns 200', async () => {
      const validKey = 'brain_' + 'ee'.repeat(32)
      const validHash = await hashToken(validKey)
      const db = getTestDb()
      const tomorrow = new Date(Date.now() + 86400000).toISOString()
      await db.prepare(
        `INSERT OR IGNORE INTO api_keys (id, user_id, name, key_hash, key_prefix, scope, expires_at, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 'write', ?, 1, datetime('now'))`
      ).bind('hk-valid-exp', TEST_USER.id, 'valid-expiry-key', validHash, validKey.slice(0, 12) + '...', tomorrow).run()

      const res = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          headers: { 'X-API-Key': validKey, 'Content-Type': 'application/json' },
        })
      )
      expect(res.status).toBe(200)
    })
  })

  // ─── Protected Routes ────────────────────────────────────────────

  describe('protected routes require auth', () => {
    const protectedPaths = [
      '/api/thoughts',
      '/api/decisions',
      '/api/sessions',
      '/api/sentiment',
      '/api/handoffs',
    ]

    for (const path of protectedPaths) {
      it(`GET ${path} requires auth`, async () => {
        const res = await SELF.fetch(`http://localhost${path}`)
        expect(res.status).toBe(401)
      })
    }

    it('POST /api/thoughts requires auth', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'no auth', type: 'note' }),
        })
      )
      expect(res.status).toBe(401)
    })
  })

  // ─── Public Routes ───────────────────────────────────────────────

  describe('public routes do not require auth', () => {
    it('GET /health is public', async () => {
      const res = await SELF.fetch('http://localhost/health')
      expect(res.status).toBe(200)
      const body = await res.json() as { status: string }
      expect(body.status).toBe('ok')
    })

    it('GET /auth/providers is public', async () => {
      const res = await SELF.fetch('http://localhost/auth/providers')
      expect(res.status).toBe(200)
      const body = await res.json() as { providers: string[] }
      expect(body.providers).toBeDefined()
    })

    it('GET /auth/github initiates OAuth (returns redirect or 503)', async () => {
      const res = await SELF.fetch('http://localhost/auth/github', { redirect: 'manual' })
      // 302 if GITHUB_CLIENT_ID is set, 503 if not
      expect([302, 503]).toContain(res.status)
    })
  })

  // ─── API Key CRUD (via /auth/api-keys) ───────────────────────────
  // These routes require cookie-based auth. Since we can't easily
  // generate a valid JWT cookie in integration tests without OAuth,
  // we test that unauthenticated requests are rejected (401).

  describe('API key CRUD routes require cookie auth', () => {
    it('POST /auth/api-keys without cookie returns 401', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/auth/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'test-key', scope: 'read' }),
        })
      )
      expect(res.status).toBe(401)
    })

    it('GET /auth/api-keys without cookie returns 401', async () => {
      const res = await SELF.fetch('http://localhost/auth/api-keys')
      expect(res.status).toBe(401)
    })

    it('DELETE /auth/api-keys/:id without cookie returns 401', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/auth/api-keys/some-id', {
          method: 'DELETE',
        })
      )
      expect(res.status).toBe(401)
    })
  })

  // ─── API Key CRUD with JWT cookie ────────────────────────────────

  describe('API key CRUD with valid JWT', () => {
    let cookie: string
    let createdKeyId: string

    beforeAll(async () => {
      // Generate a valid JWT access token and set it as a cookie
      const { generateAccessToken } = await import('../auth/jwt')
      const token = await generateAccessToken(
        {
          sub: TEST_USER.id,
          name: TEST_USER.name,
          email: TEST_USER.email,
          system_role: 'user',
        },
        // Must match vitest.config.ts miniflare bindings and wrangler.toml vars
        'test-jwt-secret-for-vitest',
        'brain-ai.dev',
      )
      cookie = `brain_access=${token}`
    })

    it('POST /auth/api-keys creates a new key', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/auth/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({ name: 'integration-test-key', scope: 'read' }),
        })
      )
      expect(res.status).toBe(200)
      const body = await res.json() as { id: string; key: string; name: string; scope: string }
      expect(body.key).toMatch(/^brain_/)
      expect(body.name).toBe('integration-test-key')
      expect(body.scope).toBe('read')
      createdKeyId = body.id
    })

    it('GET /auth/api-keys lists keys', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/auth/api-keys', {
          headers: { Cookie: cookie },
        })
      )
      expect(res.status).toBe(200)
      const body = await res.json() as Array<{ id: string; name: string }>
      // Should contain the key we created above (or keys seeded by other tests)
      expect(Array.isArray(body)).toBe(true)
      // The key we just created should be in the list
      expect(body.some(k => k.id === createdKeyId)).toBe(true)
    })

    it('DELETE /auth/api-keys/:id revokes the key', async () => {
      const res = await SELF.fetch(
        new Request(`http://localhost/auth/api-keys/${createdKeyId}`, {
          method: 'DELETE',
          headers: { Cookie: cookie },
        })
      )
      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean }
      expect(body.success).toBe(true)
    })

    it('POST /auth/api-keys rejects invalid scope', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/auth/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({ name: 'bad-scope-key', scope: 'superadmin' }),
        })
      )
      expect(res.status).toBe(400)
    })

    it('POST /auth/api-keys requires name', async () => {
      const res = await SELF.fetch(
        new Request('http://localhost/auth/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({ scope: 'read' }),
        })
      )
      expect(res.status).toBe(400)
    })

    it('newly created key can authenticate API requests', async () => {
      // Create a key
      const createRes = await SELF.fetch(
        new Request('http://localhost/auth/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({ name: 'functional-test-key', scope: 'write' }),
        })
      )
      const { key } = await createRes.json() as { key: string }

      // Use it to authenticate
      const res = await SELF.fetch(
        new Request('http://localhost/api/thoughts', {
          headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
        })
      )
      expect(res.status).toBe(200)
    })
  })
})

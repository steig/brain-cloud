import { env } from 'cloudflare:test'
import { MIGRATION_SQL } from './migrations'
import { hashToken } from '../auth/jwt'

let migrationsApplied = false

/** Apply all migration SQL statements to the test D1 database (idempotent) */
export async function applyMigrations(db: D1Database) {
  if (migrationsApplied) return
  for (const stmt of MIGRATION_SQL) {
    try {
      await db.prepare(stmt).run()
    } catch (e: unknown) {
      // Ignore errors from re-running migrations (already exists, duplicate column, etc.)
      if (e instanceof Error && (
        e.message.includes('already exists') ||
        e.message.includes('duplicate column')
      )) continue
      throw e
    }
  }
  migrationsApplied = true
}

const TEST_API_KEY = 'test-api-key-for-vitest-12345'

export const TEST_USER = {
  id: 'test-user-001',
  name: 'Test User',
  email: 'test@example.com',
  api_key: TEST_API_KEY,
} as const

/** Seed a test user with a hashed API key in the api_keys table */
export async function seedTestUser(db: D1Database) {
  await db.prepare(
    `INSERT OR IGNORE INTO users (id, name, email, system_role, is_active)
     VALUES (?, ?, ?, 'user', 1)`
  ).bind(TEST_USER.id, TEST_USER.name, TEST_USER.email).run()

  // Insert hashed API key into api_keys table
  const keyHash = await hashToken(TEST_API_KEY)
  await db.prepare(
    `INSERT OR IGNORE INTO api_keys (id, user_id, name, key_hash, key_prefix, scope, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, 'write', 1, datetime('now'))`
  ).bind('test-key-001', TEST_USER.id, 'default-test-key', keyHash, TEST_API_KEY.slice(0, 12) + '...').run()
}

/** Seed a user with a hashed API key for tenant isolation tests */
export async function seedUserWithHashedKey(db: D1Database, user: { id: string; name: string; email: string; api_key: string }) {
  await db.prepare(
    `INSERT OR IGNORE INTO users (id, name, email, system_role, is_active)
     VALUES (?, ?, ?, 'user', 1)`
  ).bind(user.id, user.name, user.email).run()

  const keyHash = await hashToken(user.api_key)
  await db.prepare(
    `INSERT OR IGNORE INTO api_keys (id, user_id, name, key_hash, key_prefix, scope, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, 'write', 1, datetime('now'))`
  ).bind(`key-${user.id}`, user.id, `${user.name}-key`, keyHash, user.api_key.slice(0, 12) + '...').run()
}

/** Build an authenticated Request object for the test worker */
export function authFetch(path: string, init?: RequestInit): Request {
  const url = `http://localhost${path}`
  return new Request(url, {
    ...init,
    headers: {
      'X-API-Key': TEST_API_KEY,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

/** Get the test D1 database from the env binding */
export function getTestDb(): D1Database {
  return env.DB
}

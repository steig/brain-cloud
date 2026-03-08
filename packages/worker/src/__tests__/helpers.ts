import { env } from 'cloudflare:test'
import { MIGRATION_SQL } from './migrations'

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

/** Seed a test user with a known API key */
export async function seedTestUser(db: D1Database) {
  await db.prepare(
    `INSERT OR IGNORE INTO users (id, name, email, api_key, system_role, is_active)
     VALUES (?, ?, ?, ?, 'user', 1)`
  ).bind(TEST_USER.id, TEST_USER.name, TEST_USER.email, TEST_USER.api_key).run()
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

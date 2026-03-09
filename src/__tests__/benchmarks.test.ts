/**
 * D1 Performance Benchmarks
 *
 * These tests seed realistic data volumes into D1 and measure query performance.
 * Skipped by default — run manually with: vitest run --testPathPattern benchmarks
 *
 * Target latencies (local Miniflare D1):
 * - List with filters: <100ms
 * - Search: <200ms
 * - Analytics aggregation: <500ms
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import { applyMigrations, seedTestUser, TEST_USER } from './helpers'

const USER_ID = TEST_USER.id

// ─── Helpers ────────────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID()
}

function randomDate(daysBack: number): string {
  const ms = Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000
  return new Date(ms).toISOString()
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const THOUGHT_TYPES = ['note', 'idea', 'question', 'todo', 'insight'] as const
const EVENT_TYPES = ['command', 'tool_use', 'completion', 'error'] as const
const FEELINGS = ['frustrated', 'confused', 'satisfied', 'excited', 'neutral', 'annoyed', 'impressed'] as const
const TARGET_TYPES = ['tool', 'library', 'pattern', 'codebase', 'task', 'process'] as const

const SAMPLE_CONTENT = [
  'Investigating auth middleware bug in JWT validation',
  'Refactored database connection pooling for better performance',
  'Need to review PR #42 for security implications',
  'Decided to use Hono over Express for Cloudflare Workers compatibility',
  'The caching strategy needs rethinking — stale reads are causing issues',
  'Implemented rate limiting using sliding window algorithm',
  'Database migration failed on production — rolled back successfully',
  'Team standup: discussed sprint priorities and blockers',
  'Found a race condition in the session cleanup handler',
  'Optimized SQL query from 200ms to 15ms by adding composite index',
]

async function timedQuery<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now()
  const result = await fn()
  const ms = Math.round((performance.now() - start) * 100) / 100
  return { result, ms }
}

// ─── Seed functions ─────────────────────────────────────────────

async function seedThoughts(db: D1Database, count: number) {
  const batchSize = 100
  for (let i = 0; i < count; i += batchSize) {
    const stmts = []
    for (let j = 0; j < batchSize && i + j < count; j++) {
      const type = pick(THOUGHT_TYPES)
      const content = pick(SAMPLE_CONTENT) + ` [${i + j}]`
      const tags = JSON.stringify([pick(['#todo', '#learned', '#blocker', '#idea']), pick(['auth', 'db', 'api', 'frontend'])])
      stmts.push(
        db.prepare(
          `INSERT INTO thoughts (id, user_id, type, content, tags, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(uuid(), USER_ID, type, content, tags, randomDate(180))
      )
    }
    await db.batch(stmts)
  }
}

async function seedDecisions(db: D1Database, count: number) {
  const batchSize = 100
  for (let i = 0; i < count; i += batchSize) {
    const stmts = []
    for (let j = 0; j < batchSize && i + j < count; j++) {
      const options = JSON.stringify([
        { option: 'Option A', pros: ['fast', 'simple'], cons: ['limited'] },
        { option: 'Option B', pros: ['flexible'], cons: ['complex', 'slow'] },
      ])
      stmts.push(
        db.prepare(
          `INSERT INTO decisions (id, user_id, title, context, options, chosen, rationale, tags, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          uuid(), USER_ID,
          `Decision ${i + j}: ${pick(['architecture', 'library', 'tooling', 'process'])} choice`,
          'Evaluating options for the project',
          options,
          'Option A',
          'Better fit for our constraints',
          JSON.stringify([pick(['architecture', 'tooling', 'process'])]),
          randomDate(180),
        )
      )
    }
    await db.batch(stmts)
  }
}

async function seedSessions(db: D1Database, count: number) {
  const batchSize = 100
  const moods = ['focused', 'exploratory', 'debugging', 'urgent', 'productive', 'blocked']
  for (let i = 0; i < count; i += batchSize) {
    const stmts = []
    for (let j = 0; j < batchSize && i + j < count; j++) {
      const startDate = randomDate(180)
      const endDate = new Date(new Date(startDate).getTime() + Math.random() * 3600000).toISOString()
      stmts.push(
        db.prepare(
          `INSERT INTO sessions (id, user_id, started_at, ended_at, mood_start, mood_end, goals, accomplishments, summary)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          uuid(), USER_ID,
          startDate, endDate,
          pick(moods), pick(moods),
          JSON.stringify(['Build feature', 'Fix bug', 'Review PR']),
          JSON.stringify(['Completed task', 'Merged PR']),
          'Session summary: worked on various tasks',
        )
      )
    }
    await db.batch(stmts)
  }
}

async function seedDxEvents(db: D1Database, count: number) {
  const batchSize = 100
  for (let i = 0; i < count; i += batchSize) {
    const stmts = []
    for (let j = 0; j < batchSize && i + j < count; j++) {
      stmts.push(
        db.prepare(
          `INSERT INTO dx_events (id, user_id, event_type, command, duration_ms, tokens_in, tokens_out, success, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          uuid(), USER_ID,
          pick(EVENT_TYPES),
          pick(['git status', 'npm test', 'vitest run', 'wrangler deploy', 'tsc --noEmit']),
          Math.floor(Math.random() * 5000),
          Math.floor(Math.random() * 10000),
          Math.floor(Math.random() * 5000),
          Math.random() > 0.1 ? 1 : 0,
          randomDate(120),
        )
      )
    }
    await db.batch(stmts)
  }
}

async function seedSentiment(db: D1Database, count: number) {
  const batchSize = 100
  for (let i = 0; i < count; i += batchSize) {
    const stmts = []
    for (let j = 0; j < batchSize && i + j < count; j++) {
      stmts.push(
        db.prepare(
          `INSERT INTO sentiment (id, user_id, target_type, target_name, feeling, intensity, reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          uuid(), USER_ID,
          pick(TARGET_TYPES),
          pick(['vitest', 'hono', 'wrangler', 'typescript', 'D1', 'zod', 'react', 'tailwind']),
          pick(FEELINGS),
          Math.floor(Math.random() * 5) + 1,
          'Reason for sentiment',
          randomDate(180),
        )
      )
    }
    await db.batch(stmts)
  }
}

// ─── Benchmarks ─────────────────────────────────────────────────

describe.skip('D1 Performance Benchmarks', () => {
  beforeAll(async () => {
    await applyMigrations(env.DB)
    await seedTestUser(env.DB)

    console.log('Seeding benchmark data...')
    const seedStart = performance.now()

    await seedThoughts(env.DB, 10_000)
    console.log('  - 10K thoughts seeded')

    await seedDecisions(env.DB, 5_000)
    console.log('  - 5K decisions seeded')

    await seedSessions(env.DB, 5_000)
    console.log('  - 5K sessions seeded')

    await seedDxEvents(env.DB, 20_000)
    console.log('  - 20K dx_events seeded')

    await seedSentiment(env.DB, 500)
    console.log('  - 500 sentiment entries seeded')

    const seedMs = Math.round(performance.now() - seedStart)
    console.log(`Seeding complete in ${seedMs}ms`)
  }, 120_000) // 2 minute timeout for seeding

  it('list thoughts with type filter — target <100ms', async () => {
    const { ms } = await timedQuery('thoughts (type=idea)', () =>
      env.DB.prepare(
        `SELECT * FROM thoughts WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 50`
      ).bind(USER_ID, 'idea').all()
    )
    console.log(`  list thoughts (type filter): ${ms}ms`)
    expect(ms).toBeLessThan(100)
  })

  it('list thoughts with date range filter — target <100ms', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const { ms } = await timedQuery('thoughts (date range)', () =>
      env.DB.prepare(
        `SELECT * FROM thoughts WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 50`
      ).bind(USER_ID, thirtyDaysAgo).all()
    )
    console.log(`  list thoughts (date range): ${ms}ms`)
    expect(ms).toBeLessThan(100)
  })

  it('list thoughts with type + date range — target <100ms', async () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString()
    const { ms } = await timedQuery('thoughts (type + date)', () =>
      env.DB.prepare(
        `SELECT * FROM thoughts WHERE user_id = ? AND type = ? AND created_at > ? ORDER BY created_at DESC LIMIT 50`
      ).bind(USER_ID, 'todo', sixtyDaysAgo).all()
    )
    console.log(`  list thoughts (type + date range): ${ms}ms`)
    expect(ms).toBeLessThan(100)
  })

  it('list decisions with search — target <100ms', async () => {
    const { ms } = await timedQuery('decisions (search)', () =>
      env.DB.prepare(
        `SELECT * FROM decisions WHERE user_id = ? AND title LIKE ? ORDER BY created_at DESC LIMIT 50`
      ).bind(USER_ID, '%architecture%').all()
    )
    console.log(`  list decisions (search): ${ms}ms`)
    expect(ms).toBeLessThan(100)
  })

  it('list sessions with date range — target <100ms', async () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()
    const { ms } = await timedQuery('sessions (date range)', () =>
      env.DB.prepare(
        `SELECT * FROM sessions WHERE user_id = ? AND started_at > ? ORDER BY started_at DESC LIMIT 50`
      ).bind(USER_ID, ninetyDaysAgo).all()
    )
    console.log(`  list sessions (date range): ${ms}ms`)
    expect(ms).toBeLessThan(100)
  })

  it('analytics: count thoughts by type — target <500ms', async () => {
    const { result, ms } = await timedQuery('count by type', () =>
      env.DB.prepare(
        `SELECT type, COUNT(*) as count FROM thoughts WHERE user_id = ? GROUP BY type`
      ).bind(USER_ID).all()
    )
    console.log(`  analytics (count by type): ${ms}ms — ${result.results.length} groups`)
    expect(ms).toBeLessThan(500)
  })

  it('analytics: dx_events grouped by date — target <500ms', async () => {
    const { result, ms } = await timedQuery('events by date', () =>
      env.DB.prepare(
        `SELECT date(created_at) as day, event_type, COUNT(*) as count
         FROM dx_events WHERE user_id = ?
         GROUP BY day, event_type
         ORDER BY day DESC
         LIMIT 200`
      ).bind(USER_ID).all()
    )
    console.log(`  analytics (events by date): ${ms}ms — ${result.results.length} rows`)
    expect(ms).toBeLessThan(500)
  })

  it('analytics: session duration stats — target <500ms', async () => {
    const { ms } = await timedQuery('session stats', () =>
      env.DB.prepare(
        `SELECT
           COUNT(*) as total,
           AVG(CAST((julianday(ended_at) - julianday(started_at)) * 86400 AS INTEGER)) as avg_duration_sec,
           MAX(CAST((julianday(ended_at) - julianday(started_at)) * 86400 AS INTEGER)) as max_duration_sec
         FROM sessions
         WHERE user_id = ? AND ended_at IS NOT NULL`
      ).bind(USER_ID).all()
    )
    console.log(`  analytics (session duration): ${ms}ms`)
    expect(ms).toBeLessThan(500)
  })

  it('full-text search across thoughts content — target <200ms', async () => {
    const { result, ms } = await timedQuery('FTS thoughts', () =>
      env.DB.prepare(
        `SELECT * FROM thoughts
         WHERE user_id = ? AND content LIKE ?
         ORDER BY created_at DESC
         LIMIT 20`
      ).bind(USER_ID, '%race condition%').all()
    )
    console.log(`  full-text search (thoughts): ${ms}ms — ${result.results.length} matches`)
    expect(ms).toBeLessThan(200)
  })

  it('full-text search across decisions — target <200ms', async () => {
    const { result, ms } = await timedQuery('FTS decisions', () =>
      env.DB.prepare(
        `SELECT * FROM decisions
         WHERE user_id = ? AND (title LIKE ? OR rationale LIKE ? OR context LIKE ?)
         ORDER BY created_at DESC
         LIMIT 20`
      ).bind(USER_ID, '%architecture%', '%architecture%', '%architecture%').all()
    )
    console.log(`  full-text search (decisions): ${ms}ms — ${result.results.length} matches`)
    expect(ms).toBeLessThan(200)
  })

  it('cross-table search (thoughts + decisions) — target <200ms', async () => {
    const { result, ms } = await timedQuery('cross-table search', () =>
      env.DB.prepare(
        `SELECT 'thought' as entity, id, content as text, created_at FROM thoughts
         WHERE user_id = ? AND content LIKE ?
         UNION ALL
         SELECT 'decision' as entity, id, title as text, created_at FROM decisions
         WHERE user_id = ? AND title LIKE ?
         ORDER BY created_at DESC
         LIMIT 20`
      ).bind(USER_ID, '%bug%', USER_ID, '%bug%').all()
    )
    console.log(`  cross-table search: ${ms}ms — ${result.results.length} matches`)
    expect(ms).toBeLessThan(200)
  })

  it('row counts summary', async () => {
    const tables = ['thoughts', 'decisions', 'sessions', 'dx_events', 'sentiment']
    const counts: Record<string, number> = {}
    for (const table of tables) {
      const row = await env.DB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE user_id = ?`)
        .bind(USER_ID).first<{ c: number }>()
      counts[table] = row?.c ?? 0
    }
    console.table(counts)
  })
})

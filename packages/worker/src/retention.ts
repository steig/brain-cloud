/**
 * Data Retention Policy Handler
 *
 * D1 Limits & Capacity Planning:
 * - D1 max: 10GB per database, ~10M rows practical limit
 * - At 100 entries/day/user, 50 users = 5K entries/day = 1.8M/year
 * - dx_events are highest volume — 90-day retention keeps ~450K rows max
 * - auth_sessions accumulate expired entries — 30-day cleanup keeps table lean
 * - Recommended: monitor row counts, alert at 5M total rows
 *
 * Retention rules:
 * - dx_events: delete after 90 days
 * - auth_sessions: delete expired sessions older than 30 days
 *
 * TODO: Archive to R2 before deletion for audit trail
 */

export interface RetentionResult {
  dx_events_deleted: number
  auth_sessions_deleted: number
}

const BATCH_SIZE = 1000

/**
 * Delete rows in batches to avoid D1 timeout (30s per request).
 * Returns total number of rows deleted.
 */
async function deleteBatched(
  db: D1Database,
  sql: string,
  params: string[],
): Promise<number> {
  let totalDeleted = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await db
      .prepare(`${sql} LIMIT ${BATCH_SIZE}`)
      .bind(...params)
      .run()
    const deleted = result.meta.changes ?? 0
    totalDeleted += deleted
    if (deleted < BATCH_SIZE) break
  }
  return totalDeleted
}

/**
 * Run data retention cleanup. Called by the scheduled cron trigger.
 */
export async function handleRetention(db: D1Database): Promise<RetentionResult> {
  const now = new Date()

  // dx_events older than 90 days
  const dxCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const dx_events_deleted = await deleteBatched(
    db,
    `DELETE FROM dx_events WHERE created_at < ?`,
    [dxCutoff],
  )

  // auth_sessions: expired AND older than 30 days
  const authCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const auth_sessions_deleted = await deleteBatched(
    db,
    `DELETE FROM auth_sessions WHERE expires_at < ? AND created_at < ?`,
    [authCutoff, authCutoff],
  )

  console.log(
    `[retention] Deleted ${dx_events_deleted} dx_events (>90d), ${auth_sessions_deleted} auth_sessions (expired >30d)`,
  )

  return { dx_events_deleted, auth_sessions_deleted }
}

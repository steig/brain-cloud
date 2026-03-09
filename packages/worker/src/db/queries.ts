// D1 query layer — replaces PostgREST + stored procedures
// All functions take D1Database and userId, enforce user_id WHERE clauses

import type { Env } from '../types'
import { deleteEmbedding } from './vectorize'

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

/** Parse JSON array stored as TEXT, return string[] */
function parseTags(raw: string | null): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

/** Parse JSON stored as TEXT */
function parseJson<T = unknown>(raw: string | null): T | null {
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

/** Serialize array/object for TEXT column storage */
function toJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}

/** Check if tags array (JSON TEXT) contains a specific tag */
function tagsContainClause(paramIndex: number): string {
  return `EXISTS (SELECT 1 FROM json_each(tags) WHERE json_each.value = ?${paramIndex})`
}

// ═══════════════════════════════════════════════════════════════════
// Machines
// ═══════════════════════════════════════════════════════════════════

export async function upsertMachine(
  db: D1Database,
  userId: string,
  hostname: string,
  os?: string,
  arch?: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  // Try to find existing
  const existing = await db.prepare(
    'SELECT id, metadata FROM machines WHERE user_id = ? AND hostname = ?'
  ).bind(userId, hostname).first<{ id: string; metadata: string }>()

  if (existing) {
    const existingMeta = parseJson<Record<string, unknown>>(existing.metadata) || {}
    const merged = { ...existingMeta, ...metadata }
    await db.prepare(
      `UPDATE machines SET last_seen = datetime('now'), os = COALESCE(?, os), arch = COALESCE(?, arch), metadata = ? WHERE id = ?`
    ).bind(os ?? null, arch ?? null, toJson(merged), existing.id).run()
    return existing.id
  }

  const id = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO machines (id, user_id, hostname, os, arch, metadata, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(id, userId, hostname, os ?? null, arch ?? null, toJson(metadata || {})).run()
  return id
}

// ═══════════════════════════════════════════════════════════════════
// Projects
// ═══════════════════════════════════════════════════════════════════

export async function upsertProject(
  db: D1Database,
  name: string,
  repoUrl?: string,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const existing = await db.prepare(
    'SELECT id, metadata FROM projects WHERE name = ?'
  ).bind(name).first<{ id: string; metadata: string }>()

  if (existing) {
    const existingMeta = parseJson<Record<string, unknown>>(existing.metadata) || {}
    const merged = { ...existingMeta, ...metadata }
    await db.prepare(
      `UPDATE projects SET repo_url = COALESCE(NULLIF(?, ''), repo_url), description = COALESCE(NULLIF(?, ''), description), metadata = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(repoUrl ?? '', description ?? '', toJson(merged), existing.id).run()
    return existing.id
  }

  const id = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO projects (id, name, repo_url, description, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(id, name, repoUrl ?? null, description ?? null, toJson(metadata || {})).run()
  return id
}

export async function listProjects(db: D1Database): Promise<Array<{ id: string; name: string; description: string | null; repo_url: string | null; visibility: string; created_at: string }>> {
  const { results } = await db.prepare('SELECT id, name, description, repo_url, visibility, created_at FROM projects ORDER BY name').all()
  return results as Array<{ id: string; name: string; description: string | null; repo_url: string | null; visibility: string; created_at: string }>
}

export async function getProject(db: D1Database, id: string) {
  return db.prepare('SELECT id, name, description, repo_url, visibility, created_at, updated_at FROM projects WHERE id = ?')
    .bind(id).first<{ id: string; name: string; description: string | null; repo_url: string | null; visibility: string; created_at: string; updated_at: string }>()
}

export async function updateProject(
  db: D1Database,
  id: string,
  data: { name?: string; description?: string; repo_url?: string; visibility?: string }
) {
  const sets: string[] = []
  const vals: unknown[] = []
  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
  if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description) }
  if (data.repo_url !== undefined) { sets.push('repo_url = ?'); vals.push(data.repo_url) }
  if (data.visibility !== undefined) { sets.push('visibility = ?'); vals.push(data.visibility) }
  if (sets.length === 0) return
  sets.push("updated_at = datetime('now')")
  vals.push(id)
  await db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
}

// ═══════════════════════════════════════════════════════════════════
// Thoughts
// ═══════════════════════════════════════════════════════════════════

export interface ThoughtRow {
  id: string
  user_id: string
  machine_id: string | null
  project_id: string | null
  type: string
  content: string
  context: string | null
  tags: string | null
  ai_model: string | null
  visibility: string | null
  created_at: string
  project_name?: string | null
  project_repo_url?: string | null
  user_name?: string | null
  user_avatar_url?: string | null
  user_github_username?: string | null
}

export interface ThoughtInput {
  machine_id?: string
  project_id?: string | null
  type?: string
  content: string
  tags?: string[]
  context?: Record<string, unknown>
  ai_model?: string
  visibility?: string
}

export async function createThought(
  db: D1Database, userId: string, input: ThoughtInput
): Promise<ThoughtRow> {
  const id = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO thoughts (id, user_id, machine_id, project_id, type, content, context, tags, ai_model, visibility, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    id, userId,
    input.machine_id ?? null,
    input.project_id ?? null,
    input.type || 'note',
    input.content,
    toJson(input.context || {}),
    toJson(input.tags || []),
    input.ai_model ?? null,
    input.visibility ?? 'private'
  ).run()

  return (await db.prepare('SELECT * FROM thoughts WHERE id = ?').bind(id).first())! as ThoughtRow
}

export async function listThoughts(
  db: D1Database,
  userId: string,
  opts: {
    type?: string
    typeNotIn?: string[]
    projectId?: string
    aiModel?: string
    tagsContain?: string[]
    createdAfter?: string
    createdBefore?: string
    limit?: number
    offset?: number
    orderBy?: string
    orderDir?: 'asc' | 'desc'
    select?: string[]
    withJoins?: boolean
  } = {}
): Promise<ThoughtRow[]> {
  const conditions: string[] = ['t.user_id = ?', 't.deleted_at IS NULL']
  const binds: unknown[] = [userId]

  if (opts.type) {
    conditions.push('t.type = ?')
    binds.push(opts.type)
  }
  if (opts.typeNotIn?.length) {
    conditions.push(`t.type NOT IN (${opts.typeNotIn.map(() => '?').join(',')})`)
    binds.push(...opts.typeNotIn)
  }
  if (opts.projectId) {
    conditions.push('t.project_id = ?')
    binds.push(opts.projectId)
  }
  if (opts.aiModel) {
    conditions.push('t.ai_model = ?')
    binds.push(opts.aiModel)
  }
  if (opts.tagsContain?.length) {
    for (const tag of opts.tagsContain) {
      conditions.push(`EXISTS (SELECT 1 FROM json_each(t.tags) WHERE json_each.value = ?)`)
      binds.push(tag)
    }
  }
  if (opts.createdAfter) {
    conditions.push('t.created_at >= ?')
    binds.push(opts.createdAfter)
  }
  if (opts.createdBefore) {
    conditions.push('t.created_at <= ?')
    binds.push(opts.createdBefore)
  }

  // Allowlist to prevent SQL injection via user-controlled orderBy
  const VALID_ORDER_COLS = new Set(['created_at', 'id', 'type', 'content', 'visibility'])
  const orderCol = VALID_ORDER_COLS.has(opts.orderBy || '') ? opts.orderBy! : 'created_at'
  const orderDir = opts.orderDir === 'asc' ? 'asc' : 'desc'
  const limit = opts.limit || 50

  let query: string
  if (opts.withJoins !== false) {
    query = `SELECT t.*, p.name as project_name, p.repo_url as project_repo_url,
             u.name as user_name, u.avatar_url as user_avatar_url, u.github_username as user_github_username
             FROM thoughts t
             LEFT JOIN projects p ON t.project_id = p.id
             LEFT JOIN users u ON t.user_id = u.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY t.${orderCol} ${orderDir}
             LIMIT ?`
  } else {
    query = `SELECT t.* FROM thoughts t WHERE ${conditions.join(' AND ')} ORDER BY t.${orderCol} ${orderDir} LIMIT ?`
  }
  binds.push(limit)

  if (opts.offset) {
    query += ' OFFSET ?'
    binds.push(opts.offset)
  }

  const stmt = db.prepare(query)
  const { results } = await stmt.bind(...binds).all()
  return results as unknown as ThoughtRow[]
}

export async function updateThought(
  db: D1Database, userId: string, id: string,
  updates: { content?: string; tags?: string[]; context?: Record<string, unknown>; type?: string }
): Promise<void> {
  const sets: string[] = []
  const binds: unknown[] = []

  if (updates.content !== undefined) { sets.push('content = ?'); binds.push(updates.content) }
  if (updates.tags !== undefined) { sets.push('tags = ?'); binds.push(toJson(updates.tags)) }
  if (updates.context !== undefined) { sets.push('context = ?'); binds.push(toJson(updates.context)) }
  if (updates.type !== undefined) { sets.push('type = ?'); binds.push(updates.type) }

  if (sets.length === 0) return

  binds.push(id, userId)
  await db.prepare(
    `UPDATE thoughts SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`
  ).bind(...binds).run()
}

export async function deleteThought(db: D1Database, userId: string, id: string, env?: Env): Promise<void> {
  await db.prepare(
    "UPDATE thoughts SET deleted_at = datetime('now') WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
  ).bind(id, userId).run()
  if (env) await deleteEmbedding(env, id)
}

export async function countThoughts(
  db: D1Database, userId: string, filter?: { createdAfter?: string; type?: string }
): Promise<number> {
  const conditions: string[] = ['user_id = ?', 'deleted_at IS NULL']
  const binds: unknown[] = [userId]

  if (filter?.createdAfter) {
    conditions.push('created_at >= ?')
    binds.push(filter.createdAfter)
  }
  if (filter?.type) {
    conditions.push('type = ?')
    binds.push(filter.type)
  }

  const row = await db.prepare(
    `SELECT COUNT(*) as cnt FROM thoughts WHERE ${conditions.join(' AND ')}`
  ).bind(...binds).first<{ cnt: number }>()
  return row?.cnt ?? 0
}

// ═══════════════════════════════════════════════════════════════════
// Decisions
// ═══════════════════════════════════════════════════════════════════

export interface DecisionRow {
  id: string
  user_id: string
  machine_id: string | null
  project_id: string | null
  title: string
  context: string | null
  options: string | null
  chosen: string | null
  rationale: string | null
  outcome: string | null
  tags: string | null
  ai_model: string | null
  created_at: string
  updated_at: string
  project_name?: string | null
  project_repo_url?: string | null
  user_name?: string | null
  user_avatar_url?: string | null
  user_github_username?: string | null
}

export interface DecisionInput {
  machine_id?: string
  project_id?: string | null
  title: string
  context?: string
  options?: Array<{ option: string; pros: string[]; cons: string[] }>
  chosen?: string
  rationale?: string
  outcome?: string
  tags?: string[]
  ai_model?: string
}

export async function createDecision(
  db: D1Database, userId: string, input: DecisionInput
): Promise<DecisionRow> {
  const id = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO decisions (id, user_id, machine_id, project_id, title, context, options, chosen, rationale, outcome, tags, ai_model, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(
    id, userId,
    input.machine_id ?? null,
    input.project_id ?? null,
    input.title,
    input.context ?? null,
    toJson(input.options || []),
    input.chosen ?? null,
    input.rationale ?? null,
    input.outcome ?? null,
    toJson(input.tags || []),
    input.ai_model ?? null
  ).run()

  return (await db.prepare('SELECT * FROM decisions WHERE id = ?').bind(id).first())! as DecisionRow
}

export async function listDecisions(
  db: D1Database,
  userId: string,
  opts: {
    projectId?: string
    aiModel?: string
    limit?: number
    createdAfter?: string
    createdBefore?: string
    ids?: string[]
    withJoins?: boolean
  } = {}
): Promise<DecisionRow[]> {
  const conditions: string[] = ['d.user_id = ?', 'd.deleted_at IS NULL']
  const binds: unknown[] = [userId]

  if (opts.projectId) {
    conditions.push('d.project_id = ?')
    binds.push(opts.projectId)
  }
  if (opts.aiModel) {
    conditions.push('d.ai_model = ?')
    binds.push(opts.aiModel)
  }
  if (opts.createdAfter) {
    conditions.push('d.created_at >= ?')
    binds.push(opts.createdAfter)
  }
  if (opts.createdBefore) {
    conditions.push('d.created_at <= ?')
    binds.push(opts.createdBefore)
  }
  if (opts.ids?.length) {
    conditions.push(`d.id IN (${opts.ids.map(() => '?').join(',')})`)
    binds.push(...opts.ids)
  }

  const limit = opts.limit || 50
  let query: string

  if (opts.withJoins !== false) {
    query = `SELECT d.*, p.name as project_name, p.repo_url as project_repo_url,
             u.name as user_name, u.avatar_url as user_avatar_url, u.github_username as user_github_username
             FROM decisions d
             LEFT JOIN projects p ON d.project_id = p.id
             LEFT JOIN users u ON d.user_id = u.id
             WHERE ${conditions.join(' AND ')}
             ORDER BY d.created_at DESC LIMIT ?`
  } else {
    query = `SELECT d.* FROM decisions d WHERE ${conditions.join(' AND ')} ORDER BY d.created_at DESC LIMIT ?`
  }
  binds.push(limit)

  const { results } = await db.prepare(query).bind(...binds).all()
  return results as unknown as DecisionRow[]
}

export async function updateDecision(
  db: D1Database, userId: string, id: string,
  updates: { outcome?: string; tags?: string[] }
): Promise<void> {
  const sets: string[] = ['updated_at = datetime(\'now\')']
  const binds: unknown[] = []

  if (updates.outcome !== undefined) { sets.push('outcome = ?'); binds.push(updates.outcome) }
  if (updates.tags !== undefined) { sets.push('tags = ?'); binds.push(toJson(updates.tags)) }

  binds.push(id, userId)
  await db.prepare(
    `UPDATE decisions SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`
  ).bind(...binds).run()
}

export async function deleteDecision(db: D1Database, userId: string, id: string, env?: Env): Promise<void> {
  await db.prepare(
    "UPDATE decisions SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
  ).bind(id, userId).run()
  if (env) await deleteEmbedding(env, id)
}

export async function countDecisions(
  db: D1Database, userId: string, filter?: { createdAfter?: string }
): Promise<number> {
  const conditions: string[] = ['user_id = ?', 'deleted_at IS NULL']
  const binds: unknown[] = [userId]
  if (filter?.createdAfter) {
    conditions.push('created_at >= ?')
    binds.push(filter.createdAfter)
  }
  const row = await db.prepare(
    `SELECT COUNT(*) as cnt FROM decisions WHERE ${conditions.join(' AND ')}`
  ).bind(...binds).first<{ cnt: number }>()
  return row?.cnt ?? 0
}

// ═══════════════════════════════════════════════════════════════════
// Sessions
// ═══════════════════════════════════════════════════════════════════

export interface SessionRow {
  id: string
  user_id: string
  machine_id: string | null
  project_id: string | null
  started_at: string
  ended_at: string | null
  mood_start: string | null
  mood_end: string | null
  goals: string | null
  accomplishments: string | null
  blockers: string | null
  summary: string | null
  metadata: string | null
  ai_model: string | null
  project_name?: string | null
  user_name?: string | null
  user_avatar_url?: string | null
  user_github_username?: string | null
}

export interface SessionInput {
  machine_id?: string
  project_id?: string | null
  mood_start?: string
  goals?: string[]
  ai_model?: string
  metadata?: Record<string, unknown>
}

export async function createSession(
  db: D1Database, userId: string, input: SessionInput
): Promise<SessionRow> {
  const id = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO sessions (id, user_id, machine_id, project_id, started_at, mood_start, goals, ai_model, metadata)
     VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)`
  ).bind(
    id, userId,
    input.machine_id ?? null,
    input.project_id ?? null,
    input.mood_start ?? null,
    toJson(input.goals || []),
    input.ai_model ?? null,
    toJson(input.metadata || {})
  ).run()

  return (await db.prepare('SELECT * FROM sessions WHERE id = ?').bind(id).first())! as SessionRow
}

export async function updateSession(
  db: D1Database, userId: string, id: string,
  updates: {
    ended_at?: string
    mood_end?: string
    accomplishments?: string[]
    blockers?: string[]
    summary?: string
    metadata?: Record<string, unknown>
  }
): Promise<SessionRow | null> {
  const sets: string[] = []
  const binds: unknown[] = []

  if (updates.ended_at !== undefined) { sets.push('ended_at = ?'); binds.push(updates.ended_at) }
  if (updates.mood_end !== undefined) { sets.push('mood_end = ?'); binds.push(updates.mood_end) }
  if (updates.accomplishments !== undefined) { sets.push('accomplishments = ?'); binds.push(toJson(updates.accomplishments)) }
  if (updates.blockers !== undefined) { sets.push('blockers = ?'); binds.push(toJson(updates.blockers)) }
  if (updates.summary !== undefined) { sets.push('summary = ?'); binds.push(updates.summary) }
  if (updates.metadata !== undefined) { sets.push('metadata = ?'); binds.push(toJson(updates.metadata)) }

  if (sets.length === 0) return null

  binds.push(id, userId)
  await db.prepare(
    `UPDATE sessions SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`
  ).bind(...binds).run()

  return (await db.prepare('SELECT * FROM sessions WHERE id = ?').bind(id).first()) as SessionRow | null
}

export async function listSessions(
  db: D1Database,
  userId: string,
  opts: {
    projectId?: string
    aiModel?: string
    startedAfter?: string
    startedBefore?: string
    limit?: number
    withScores?: boolean
  } = {}
): Promise<SessionRow[]> {
  const conditions: string[] = ['s.user_id = ?']
  const binds: unknown[] = [userId]

  if (opts.projectId) { conditions.push('s.project_id = ?'); binds.push(opts.projectId) }
  if (opts.aiModel) { conditions.push('s.ai_model = ?'); binds.push(opts.aiModel) }
  if (opts.startedAfter) { conditions.push('s.started_at >= ?'); binds.push(opts.startedAfter) }
  if (opts.startedBefore) { conditions.push('s.started_at <= ?'); binds.push(opts.startedBefore) }

  const limit = opts.limit || 30
  binds.push(limit)

  const query = `SELECT s.*, p.name as project_name,
                 u.name as user_name, u.avatar_url as user_avatar_url, u.github_username as user_github_username
                 FROM sessions s
                 LEFT JOIN projects p ON s.project_id = p.id
                 LEFT JOIN users u ON s.user_id = u.id
                 WHERE ${conditions.join(' AND ')}
                 ORDER BY s.started_at DESC LIMIT ?`

  const { results } = await db.prepare(query).bind(...binds).all()
  return results as unknown as SessionRow[]
}

export async function getSession(
  db: D1Database, userId: string, id: string
): Promise<SessionRow | null> {
  return await db.prepare(
    'SELECT * FROM sessions WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first() as SessionRow | null
}

// ═══════════════════════════════════════════════════════════════════
// Sentiment
// ═══════════════════════════════════════════════════════════════════

export interface SentimentInput {
  target_type: string
  target_name: string
  feeling: string
  intensity?: number
  reason?: string
  project_id?: string | null
  ai_model?: string
}

export async function createSentiment(
  db: D1Database, userId: string, input: SentimentInput
): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO sentiment (id, user_id, target_type, target_name, feeling, intensity, reason, project_id, ai_model, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    id, userId, input.target_type, input.target_name, input.feeling,
    input.intensity ?? 3, input.reason ?? null,
    input.project_id ?? null, input.ai_model ?? null
  ).run()
  return { id }
}

export async function listSentiment(
  db: D1Database,
  userId: string,
  opts: { projectId?: string; aiModel?: string; limit?: number } = {}
): Promise<unknown[]> {
  const conditions: string[] = ['s.user_id = ?']
  const binds: unknown[] = [userId]

  if (opts.projectId) { conditions.push('s.project_id = ?'); binds.push(opts.projectId) }
  if (opts.aiModel) { conditions.push('s.ai_model = ?'); binds.push(opts.aiModel) }

  binds.push(opts.limit || 50)

  const { results } = await db.prepare(
    `SELECT s.*, p.name as project_name,
     u.name as user_name, u.avatar_url as user_avatar_url, u.github_username as user_github_username
     FROM sentiment s
     LEFT JOIN projects p ON s.project_id = p.id
     LEFT JOIN users u ON s.user_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.created_at DESC LIMIT ?`
  ).bind(...binds).all()
  return results
}

// ═══════════════════════════════════════════════════════════════════
// DX Events + Costs
// ═══════════════════════════════════════════════════════════════════

export async function createDxEvent(
  db: D1Database, userId: string,
  input: {
    machine_id?: string
    project_id?: string | null
    event_type: string
    command?: string
    duration_ms?: number
    tokens_in?: number
    tokens_out?: number
    success?: boolean
    error_message?: string
    ai_model?: string
  }
): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO dx_events (id, user_id, machine_id, project_id, event_type, command, duration_ms, tokens_in, tokens_out, success, error_message, ai_model, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    id, userId, input.machine_id ?? null, input.project_id ?? null, input.event_type,
    input.command ?? null, input.duration_ms ?? null,
    input.tokens_in ?? null, input.tokens_out ?? null,
    input.success ?? true ? 1 : 0, input.error_message ?? null,
    input.ai_model ?? null
  ).run()
  return { id }
}

export async function listDxEvents(
  db: D1Database, userId: string,
  opts: { days?: number; limit?: number } = {}
): Promise<unknown[]> {
  const fromDate = new Date(Date.now() - (opts.days || 7) * 86400000).toISOString()
  const { results } = await db.prepare(
    `SELECT id, event_type, command, duration_ms, tokens_in, tokens_out, success, error_message, created_at
     FROM dx_events WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?`
  ).bind(userId, fromDate, opts.limit || 100).all()
  return results
}

export async function listDxCosts(
  db: D1Database, userId: string,
  opts: { days?: number } = {}
): Promise<unknown[]> {
  const fromDate = new Date(Date.now() - (opts.days || 30) * 86400000).toISOString().split('T')[0]
  const { results } = await db.prepare(
    `SELECT date, model, tokens_in, tokens_out, cost_usd, request_count
     FROM dx_costs WHERE user_id = ? AND date >= ? ORDER BY date DESC`
  ).bind(userId, fromDate).all()
  return results
}

// ═══════════════════════════════════════════════════════════════════
// Conversations
// ═══════════════════════════════════════════════════════════════════

export async function createConversation(
  db: D1Database, userId: string,
  input: {
    machine_id?: string
    project_id?: string | null
    session_id?: string
    ai_model?: string
    prompt_text: string
    response_summary?: string
    turns?: number
    prompt_tokens?: number
    response_tokens?: number
    goal_achieved?: boolean
    context_sufficient?: boolean
    quality_score?: number
    tags?: string[]
    metadata?: Record<string, unknown>
  }
): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO conversations (id, user_id, machine_id, project_id, session_id, ai_model, prompt_text, response_summary, turns, prompt_tokens, response_tokens, goal_achieved, context_sufficient, quality_score, tags, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    id, userId, input.machine_id ?? null, input.project_id ?? null,
    input.session_id ?? null, input.ai_model ?? null,
    input.prompt_text, input.response_summary ?? null,
    input.turns ?? 1, input.prompt_tokens ?? null, input.response_tokens ?? null,
    input.goal_achieved != null ? (input.goal_achieved ? 1 : 0) : null,
    input.context_sufficient != null ? (input.context_sufficient ? 1 : 0) : null,
    input.quality_score ?? null,
    toJson(input.tags || []), toJson(input.metadata || {})
  ).run()
  return { id }
}

// ═══════════════════════════════════════════════════════════════════
// Decision Reviews
// ═══════════════════════════════════════════════════════════════════

export async function createDecisionReview(
  db: D1Database, userId: string,
  input: {
    decision_id: string
    review_type?: string
    outcome_rating?: number
    outcome_notes?: string
    lessons_learned?: string
    would_decide_same?: boolean
    follow_up_days?: number
  }
): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  const nextReview = input.follow_up_days
    ? new Date(Date.now() + input.follow_up_days * 86400000).toISOString()
    : null

  await db.prepare(
    `INSERT INTO decision_reviews (id, decision_id, user_id, review_type, outcome_rating, outcome_notes, lessons_learned, would_decide_same, follow_up_days, next_review_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    id, input.decision_id, userId,
    input.review_type || 'follow_up',
    input.outcome_rating ?? null,
    input.outcome_notes ?? null,
    input.lessons_learned ?? null,
    input.would_decide_same != null ? (input.would_decide_same ? 1 : 0) : null,
    input.follow_up_days ?? null,
    nextReview
  ).run()
  return { id }
}

// ═══════════════════════════════════════════════════════════════════
// Session Scores
// ═══════════════════════════════════════════════════════════════════

export async function listSessionScores(
  db: D1Database, userId: string,
  opts: { sessionId?: string; scoredAfter?: string } = {}
): Promise<unknown[]> {
  const conditions: string[] = ['ss.user_id = ?']
  const binds: unknown[] = [userId]

  if (opts.sessionId) { conditions.push('ss.session_id = ?'); binds.push(opts.sessionId) }
  if (opts.scoredAfter) { conditions.push('ss.scored_at >= ?'); binds.push(opts.scoredAfter) }

  const { results } = await db.prepare(
    `SELECT ss.* FROM session_scores ss WHERE ${conditions.join(' AND ')} ORDER BY ss.scored_at DESC`
  ).bind(...binds).all()
  return results
}

// ═══════════════════════════════════════════════════════════════════
// Search (replaces search_brain RPC)
// ═══════════════════════════════════════════════════════════════════

export async function searchBrain(
  db: D1Database, userId: string, query: string, limit: number = 20
): Promise<Array<{ id: string; type: string; content: string; created_at: string }>> {
  const likeQuery = `%${query}%`

  const { results } = await db.prepare(
    `SELECT id, 'thought' as type, content, created_at FROM thoughts
     WHERE user_id = ? AND deleted_at IS NULL AND content LIKE ?
     UNION ALL
     SELECT id, 'decision' as type, title as content, created_at FROM decisions
     WHERE user_id = ? AND deleted_at IS NULL AND (title LIKE ? OR context LIKE ? OR rationale LIKE ?)
     ORDER BY created_at DESC LIMIT ?`
  ).bind(userId, likeQuery, userId, likeQuery, likeQuery, likeQuery, limit).all()

  return results as Array<{ id: string; type: string; content: string; created_at: string }>
}

// ═══════════════════════════════════════════════════════════════════
// Timeline (replaces timeline RPC)
// ═══════════════════════════════════════════════════════════════════

export async function getTimeline(
  db: D1Database, userId: string,
  fromDate: string, toDate: string, limit: number = 50
): Promise<Array<{ id: string; type: string; content: string; project_name: string | null; created_at: string }>> {
  const { results } = await db.prepare(
    `SELECT t.id, 'thought' as type, t.content, p.name as project_name, t.created_at
     FROM thoughts t LEFT JOIN projects p ON t.project_id = p.id
     WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.created_at BETWEEN ? AND ?
     UNION ALL
     SELECT d.id, 'decision' as type, d.title as content, p.name as project_name, d.created_at
     FROM decisions d LEFT JOIN projects p ON d.project_id = p.id
     WHERE d.user_id = ? AND d.deleted_at IS NULL AND d.created_at BETWEEN ? AND ?
     UNION ALL
     SELECT s.id, 'session' as type, COALESCE(s.summary, 'Session') as content, p.name as project_name, s.started_at as created_at
     FROM sessions s LEFT JOIN projects p ON s.project_id = p.id
     WHERE s.user_id = ? AND s.started_at BETWEEN ? AND ?
     ORDER BY created_at DESC LIMIT ?`
  ).bind(userId, fromDate, toDate, userId, fromDate, toDate, userId, fromDate, toDate, limit).all()

  return results as Array<{ id: string; type: string; content: string; project_name: string | null; created_at: string }>
}

// ═══════════════════════════════════════════════════════════════════
// Brain Summary (replaces brain_summary RPC)
// ═══════════════════════════════════════════════════════════════════

export async function getBrainSummary(
  db: D1Database, userId: string,
  fromDate: string, toDate: string, projectId?: string | null
) {
  const projectFilter = projectId ? 'AND project_id = ?' : ''
  const projectBind = projectId ? [projectId] : []

  // Run all aggregations in parallel
  const [
    thoughtCount,
    decisionCount,
    sessionStats,
    thoughtsByType,
    tagCounts,
    recentDecisions,
    recentInsights,
    recentAccomplishments,
    recentBlockers,
    activeDays,
  ] = await Promise.all([
    // Total thoughts
    db.prepare(
      `SELECT COUNT(*) as cnt FROM thoughts WHERE user_id = ? AND deleted_at IS NULL AND created_at BETWEEN ? AND ? ${projectFilter}`
    ).bind(userId, fromDate, toDate, ...projectBind).first<{ cnt: number }>(),

    // Total decisions
    db.prepare(
      `SELECT COUNT(*) as cnt FROM decisions WHERE user_id = ? AND deleted_at IS NULL AND created_at BETWEEN ? AND ? ${projectFilter}`
    ).bind(userId, fromDate, toDate, ...projectBind).first<{ cnt: number }>(),

    // Session stats
    db.prepare(
      `SELECT COUNT(*) as session_count,
       COALESCE(SUM(CASE WHEN ended_at IS NOT NULL THEN (julianday(ended_at) - julianday(started_at)) * 1440 ELSE 0 END), 0) as total_minutes
       FROM sessions WHERE user_id = ? AND started_at BETWEEN ? AND ? ${projectFilter}`
    ).bind(userId, fromDate, toDate, ...projectBind).first<{ session_count: number; total_minutes: number }>(),

    // Thoughts by type
    db.prepare(
      `SELECT type, COUNT(*) as cnt FROM thoughts WHERE user_id = ? AND deleted_at IS NULL AND created_at BETWEEN ? AND ? ${projectFilter} GROUP BY type`
    ).bind(userId, fromDate, toDate, ...projectBind).all(),

    // Tag counts (via json_each)
    db.prepare(
      `SELECT je.value as tag, COUNT(*) as cnt FROM thoughts, json_each(tags) je
       WHERE user_id = ? AND deleted_at IS NULL AND created_at BETWEEN ? AND ? ${projectFilter}
       AND je.value NOT IN ('task-start','task-complete','task-blocked','git','commit')
       GROUP BY je.value ORDER BY cnt DESC LIMIT 10`
    ).bind(userId, fromDate, toDate, ...projectBind).all(),

    // Recent decisions
    db.prepare(
      `SELECT title, chosen, rationale, created_at, tags FROM decisions
       WHERE user_id = ? AND deleted_at IS NULL AND created_at BETWEEN ? AND ? ${projectFilter}
       ORDER BY created_at DESC LIMIT 5`
    ).bind(userId, fromDate, toDate, ...projectBind).all(),

    // Insights
    db.prepare(
      `SELECT content, created_at, tags FROM thoughts
       WHERE user_id = ? AND deleted_at IS NULL AND type = 'insight' AND created_at BETWEEN ? AND ? ${projectFilter}
       ORDER BY created_at DESC LIMIT 5`
    ).bind(userId, fromDate, toDate, ...projectBind).all(),

    // Accomplishments from sessions
    db.prepare(
      `SELECT accomplishments, started_at FROM sessions
       WHERE user_id = ? AND started_at BETWEEN ? AND ? ${projectFilter}
       AND accomplishments IS NOT NULL AND accomplishments != '[]'
       ORDER BY started_at DESC LIMIT 5`
    ).bind(userId, fromDate, toDate, ...projectBind).all(),

    // Blockers from sessions
    db.prepare(
      `SELECT blockers, started_at FROM sessions
       WHERE user_id = ? AND started_at BETWEEN ? AND ? ${projectFilter}
       AND blockers IS NOT NULL AND blockers != '[]'
       ORDER BY started_at DESC LIMIT 3`
    ).bind(userId, fromDate, toDate, ...projectBind).all(),

    // Active days
    db.prepare(
      `SELECT COUNT(DISTINCT date(created_at)) as cnt FROM (
         SELECT created_at FROM thoughts WHERE user_id = ? AND deleted_at IS NULL AND created_at BETWEEN ? AND ? ${projectFilter}
         UNION
         SELECT created_at FROM decisions WHERE user_id = ? AND deleted_at IS NULL AND created_at BETWEEN ? AND ? ${projectFilter}
       )`
    ).bind(userId, fromDate, toDate, ...projectBind, userId, fromDate, toDate, ...projectBind).first<{ cnt: number }>(),
  ])

  // Build thoughts_by_type object
  const thoughtsTypeObj: Record<string, number> = {}
  for (const row of (thoughtsByType.results || []) as Array<{ type: string; cnt: number }>) {
    thoughtsTypeObj[row.type] = row.cnt
  }

  // Parse accomplishments and blockers from JSON arrays
  const accomplishments: Array<{ content: string; date: string }> = []
  for (const row of (recentAccomplishments.results || []) as Array<{ accomplishments: string; started_at: string }>) {
    const items = parseTags(row.accomplishments)
    for (const item of items) {
      accomplishments.push({ content: item, date: row.started_at.slice(0, 10) })
    }
  }

  const blockers: Array<{ content: string; date: string }> = []
  for (const row of (recentBlockers.results || []) as Array<{ blockers: string; started_at: string }>) {
    const items = parseTags(row.blockers)
    for (const item of items) {
      blockers.push({ content: item, date: row.started_at.slice(0, 10) })
    }
  }

  return {
    stats: {
      total_thoughts: thoughtCount?.cnt ?? 0,
      total_decisions: decisionCount?.cnt ?? 0,
      total_sessions: sessionStats?.session_count ?? 0,
      active_days: activeDays?.cnt ?? 0,
      total_session_minutes: Math.round(sessionStats?.total_minutes ?? 0),
      thoughts_by_type: thoughtsTypeObj,
    },
    themes: (tagCounts.results || []) as Array<{ tag: string; cnt: number }>,
    decisions: (recentDecisions.results || []).map((d: any) => ({
      title: d.title,
      chosen: d.chosen,
      rationale: d.rationale,
      date: d.created_at?.slice(0, 10),
      tags: parseTags(d.tags),
    })),
    insights: (recentInsights.results || []).map((i: any) => ({
      content: i.content,
      date: i.created_at?.slice(0, 10),
      tags: parseTags(i.tags),
    })),
    problems_solved: [],  // Simplified: skip regex pattern matching for now
    accomplishments: accomplishments.slice(0, 5),
    blockers: blockers.slice(0, 3),
  }
}

// ═══════════════════════════════════════════════════════════════════
// DX Summary (replaces dx_summary RPC)
// ═══════════════════════════════════════════════════════════════════

export async function getDxSummary(
  db: D1Database, userId: string, fromDate: string, toDate: string
) {
  const [eventStats, costStats, topCommands] = await Promise.all([
    db.prepare(
      `SELECT COUNT(*) as total_events,
       COALESCE(AVG(duration_ms), 0) as avg_duration_ms,
       COALESCE(AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) * 100, 0) as success_rate
       FROM dx_events WHERE user_id = ? AND date(created_at) BETWEEN ? AND ?`
    ).bind(userId, fromDate, toDate).first(),

    db.prepare(
      `SELECT COALESCE(SUM(tokens_in), 0) as total_tokens_in,
       COALESCE(SUM(tokens_out), 0) as total_tokens_out,
       COALESCE(SUM(cost_usd), 0) as total_cost
       FROM dx_costs WHERE user_id = ? AND date BETWEEN ? AND ?`
    ).bind(userId, fromDate, toDate).first(),

    db.prepare(
      `SELECT command, COUNT(*) as count FROM dx_events
       WHERE user_id = ? AND date(created_at) BETWEEN ? AND ? AND command IS NOT NULL
       GROUP BY command ORDER BY count DESC LIMIT 10`
    ).bind(userId, fromDate, toDate).all(),
  ])

  return {
    total_events: (eventStats as any)?.total_events ?? 0,
    total_tokens_in: (costStats as any)?.total_tokens_in ?? 0,
    total_tokens_out: (costStats as any)?.total_tokens_out ?? 0,
    total_cost: (costStats as any)?.total_cost ?? 0,
    avg_duration_ms: (eventStats as any)?.avg_duration_ms ?? 0,
    success_rate: (eventStats as any)?.success_rate ?? 0,
    top_commands: (topCommands.results || []) as Array<{ command: string; count: number }>,
  }
}

// ═══════════════════════════════════════════════════════════════════
// Coaching Data (replaces coaching_daily_data RPC)
// ═══════════════════════════════════════════════════════════════════

export async function getCoachingDailyData(
  db: D1Database, userId: string, days: number
) {
  const fromDate = new Date(Date.now() - days * 86400000).toISOString()

  const [sessions, thoughts, decisions, sentiment, conversations] = await Promise.all([
    db.prepare(
      `SELECT COUNT(*) as total,
       COUNT(CASE WHEN ended_at IS NOT NULL THEN 1 END) as completed,
       COUNT(CASE WHEN accomplishments IS NOT NULL AND accomplishments != '[]' THEN 1 END) as with_accomplishments,
       COUNT(CASE WHEN blockers IS NOT NULL AND blockers != '[]' THEN 1 END) as with_blockers
       FROM sessions WHERE user_id = ? AND started_at >= ?`
    ).bind(userId, fromDate).first(),

    db.prepare(
      `SELECT COUNT(*) as total,
       COUNT(CASE WHEN type = 'insight' THEN 1 END) as insights,
       COUNT(CASE WHEN type = 'todo' THEN 1 END) as todos,
       COUNT(CASE WHEN type = 'idea' THEN 1 END) as ideas
       FROM thoughts WHERE user_id = ? AND deleted_at IS NULL AND created_at >= ?`
    ).bind(userId, fromDate).first(),

    db.prepare(
      `SELECT COUNT(*) as total,
       COUNT(CASE WHEN outcome IS NOT NULL THEN 1 END) as with_outcome
       FROM decisions WHERE user_id = ? AND deleted_at IS NULL AND created_at >= ?`
    ).bind(userId, fromDate).first(),

    db.prepare(
      `SELECT feeling, COUNT(*) as count FROM sentiment
       WHERE user_id = ? AND created_at >= ?
       GROUP BY feeling ORDER BY count DESC`
    ).bind(userId, fromDate).all(),

    db.prepare(
      `SELECT COUNT(*) as total,
       AVG(quality_score) as avg_quality,
       AVG(CASE WHEN goal_achieved THEN 1.0 ELSE 0.0 END) as goal_rate,
       AVG(CASE WHEN context_sufficient THEN 1.0 ELSE 0.0 END) as context_rate
       FROM conversations WHERE user_id = ? AND created_at >= ?`
    ).bind(userId, fromDate).first(),
  ])

  return {
    sessions,
    thoughts,
    decisions,
    sentiment: sentiment.results,
    conversations,
  }
}

// ═══════════════════════════════════════════════════════════════════
// User lookup by API key (legacy plaintext fallback)
// ═══════════════════════════════════════════════════════════════════

export async function findUserByApiKey(
  db: D1Database, apiKey: string
): Promise<{ id: string; name: string; email: string | null; avatar_url: string | null; system_role: string } | null> {
  return db.prepare(
    'SELECT id, name, email, avatar_url, system_role FROM users WHERE api_key = ? AND is_active = 1'
  ).bind(apiKey).first()
}

// ═══════════════════════════════════════════════════════════════════
// API Keys (multi-key support with SHA-256 hashing)
// ═══════════════════════════════════════════════════════════════════

export interface ApiKeyRow {
  id: string
  user_id: string
  name: string
  key_prefix: string
  scope: string
  expires_at: string | null
  created_at: string
  last_used_at: string | null
  is_active: number
}

export async function createApiKey(
  db: D1Database, userId: string, name: string, keyHash: string, keyPrefix: string,
  scope: string = 'write', expiresAt?: string
): Promise<ApiKeyRow> {
  const id = crypto.randomUUID()
  await db.prepare(
    `INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, scope, expires_at, created_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 1)`
  ).bind(id, userId, name, keyHash, keyPrefix, scope, expiresAt ?? null).run()

  return (await db.prepare('SELECT id, user_id, name, key_prefix, scope, expires_at, created_at, last_used_at, is_active FROM api_keys WHERE id = ?').bind(id).first())! as ApiKeyRow
}

export async function listApiKeys(
  db: D1Database, userId: string
): Promise<ApiKeyRow[]> {
  const { results } = await db.prepare(
    'SELECT id, user_id, name, key_prefix, scope, expires_at, created_at, last_used_at, is_active FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()
  return results as unknown as ApiKeyRow[]
}

export async function revokeApiKey(
  db: D1Database, userId: string, keyId: string
): Promise<void> {
  await db.prepare(
    'UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?'
  ).bind(keyId, userId).run()
}

export async function findUserByKeyHash(
  db: D1Database, keyHash: string
): Promise<{ id: string; name: string; email: string | null; avatar_url: string | null; system_role: string; key_scope: string; expired?: boolean } | null> {
  const row = await db.prepare(
    `SELECT u.id, u.name, u.email, u.avatar_url, u.system_role, ak.id as key_id, ak.scope, ak.expires_at
     FROM api_keys ak JOIN users u ON ak.user_id = u.id
     WHERE ak.key_hash = ? AND ak.is_active = 1 AND u.is_active = 1`
  ).bind(keyHash).first<{ id: string; name: string; email: string | null; avatar_url: string | null; system_role: string; key_id: string; scope: string; expires_at: string | null }>()

  if (!row) return null

  // Reject expired keys with a distinguishable marker
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { id: row.id, name: row.name, email: row.email, avatar_url: row.avatar_url, system_role: row.system_role, key_scope: row.scope, expired: true }
  }

  // Update last_used_at (fire-and-forget)
  db.prepare('UPDATE api_keys SET last_used_at = datetime(\'now\') WHERE id = ?').bind(row.key_id).run()

  return { id: row.id, name: row.name, email: row.email, avatar_url: row.avatar_url, system_role: row.system_role, key_scope: row.scope }
}

// ═══════════════════════════════════════════════════════════════════
// Utility exports
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// Handoffs
// ═══════════════════════════════════════════════════════════════════

export interface HandoffRow {
  id: string
  user_id: string
  from_project: string | null
  to_project: string
  handoff_type: string
  priority: string
  message: string
  metadata: string | null
  status: string
  claimed_at: string | null
  claim_note: string | null
  created_at: string
}

export interface HandoffInput {
  from_project?: string
  to_project: string
  handoff_type?: string
  priority?: string
  message: string
  metadata?: Record<string, unknown>
}

const VALID_HANDOFF_TYPES = new Set(['context', 'decision', 'blocker', 'task'])
const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent'])

export async function createHandoff(
  db: D1Database, userId: string, input: HandoffInput
): Promise<HandoffRow> {
  const id = crypto.randomUUID()
  const handoffType = VALID_HANDOFF_TYPES.has(input.handoff_type || '') ? input.handoff_type! : 'context'
  const priority = VALID_PRIORITIES.has(input.priority || '') ? input.priority! : 'medium'

  await db.prepare(
    `INSERT INTO handoffs (id, user_id, from_project, to_project, handoff_type, priority, message, metadata, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`
  ).bind(
    id, userId,
    input.from_project ?? null,
    input.to_project,
    handoffType,
    priority,
    input.message,
    toJson(input.metadata || {})
  ).run()

  return (await db.prepare('SELECT * FROM handoffs WHERE id = ?').bind(id).first())! as HandoffRow
}

export async function listHandoffs(
  db: D1Database, userId: string,
  opts: { toProject?: string; status?: string; limit?: number } = {}
): Promise<HandoffRow[]> {
  const conditions: string[] = ['user_id = ?']
  const binds: unknown[] = [userId]

  if (opts.toProject) {
    conditions.push('to_project = ?')
    binds.push(opts.toProject)
  }
  if (opts.status) {
    conditions.push('status = ?')
    binds.push(opts.status)
  }

  binds.push(opts.limit || 50)

  const { results } = await db.prepare(
    `SELECT * FROM handoffs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT ?`
  ).bind(...binds).all()
  return results as unknown as HandoffRow[]
}

export async function claimHandoff(
  db: D1Database, userId: string, id: string, note?: string
): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE handoffs SET status = 'claimed', claimed_at = datetime('now'), claim_note = ?
     WHERE id = ? AND user_id = ? AND status = 'pending'`
  ).bind(note ?? null, id, userId).run()
  return (result.meta?.changes ?? 0) > 0
}

// ═══════════════════════════════════════════════════════════════════
// Account Deletion (GDPR right-to-erasure)
// ═══════════════════════════════════════════════════════════════════

export async function deleteUserAccount(db: D1Database, userId: string): Promise<void> {
  // Audit log (no PII — just user ID + timestamp)
  console.log(`[ACCOUNT_DELETION] user=${userId} at=${new Date().toISOString()}`)

  // 1. Find teams where this user is the sole owner — delete those teams entirely
  const { results: ownedTeams } = await db.prepare(
    `SELECT tm.team_id FROM team_members tm
     WHERE tm.user_id = ? AND tm.role = 'owner'`
  ).bind(userId).all<{ team_id: string }>()

  for (const { team_id } of ownedTeams ?? []) {
    // Check if there are other owners
    const otherOwner = await db.prepare(
      `SELECT id FROM team_members WHERE team_id = ? AND role = 'owner' AND user_id != ?`
    ).bind(team_id, userId).first()

    if (!otherOwner) {
      // Sole owner — cascade delete the entire team
      await db.batch([
        db.prepare('DELETE FROM team_invites WHERE team_id = ?').bind(team_id),
        db.prepare('DELETE FROM team_members WHERE team_id = ?').bind(team_id),
        db.prepare('DELETE FROM teams WHERE id = ?').bind(team_id),
      ])
    }
  }

  // 2. Find user's projects and clean up github data linked through them
  const { results: userProjects } = await db.prepare(
    `SELECT id FROM projects WHERE owner_id = ?`
  ).bind(userId).all<{ id: string }>()

  for (const { id: projectId } of userProjects ?? []) {
    const { results: repos } = await db.prepare(
      `SELECT id FROM github_repos WHERE project_id = ?`
    ).bind(projectId).all<{ id: string }>()

    for (const { id: repoId } of repos ?? []) {
      await db.batch([
        db.prepare('DELETE FROM github_activity WHERE repo_id = ?').bind(repoId),
        db.prepare('DELETE FROM github_collaborators WHERE repo_id = ?').bind(repoId),
      ])
    }
    await db.prepare('DELETE FROM github_repos WHERE project_id = ?').bind(projectId).run()
  }

  // 3. Delete user data from child tables (order matters for FK constraints)
  //    D1 batch executes statements sequentially in order
  await db.batch([
    db.prepare('DELETE FROM dx_events WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM dx_costs WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM dx_feedback WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM dx_patterns WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM prompt_metrics WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM event_triggers WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM conversations WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM session_scores WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM sentiment WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM decision_reviews WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM handoffs WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM thoughts WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM decisions WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
  ])

  // 4. Delete auth/identity + team/project membership
  await db.batch([
    db.prepare('DELETE FROM api_keys WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM oauth_accounts WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM team_invites WHERE invited_by = ?').bind(userId),
    db.prepare('DELETE FROM team_members WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM project_members WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM machines WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM projects WHERE owner_id = ?').bind(userId),
  ])

  // 5. Finally delete the user row
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()

  // TODO: Vectorize embeddings are not deleted here — would require listing
  // all entry IDs for this user's thoughts/decisions first. Low priority since
  // embeddings contain no PII (just vectors + IDs that no longer resolve).
}

// ═══════════════════════════════════════════════════════════════════
// Teams
// ═══════════════════════════════════════════════════════════════════

export async function createTeam(
  db: D1Database,
  userId: string,
  data: { name: string; slug: string; description?: string }
): Promise<Record<string, unknown>> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  // Create team
  await db.prepare(
    `INSERT INTO teams (id, name, slug, description, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, data.name, data.slug, data.description ?? null, userId, now, now).run()

  // Add creator as owner
  await db.prepare(
    `INSERT INTO team_members (id, team_id, user_id, role, joined_at)
     VALUES (?, ?, ?, 'owner', ?)`
  ).bind(crypto.randomUUID(), id, userId, now).run()

  return { id, name: data.name, slug: data.slug, description: data.description ?? null, created_by: userId, created_at: now, updated_at: now }
}

export async function listUserTeams(
  db: D1Database,
  userId: string
): Promise<Array<Record<string, unknown>>> {
  const result = await db.prepare(
    `SELECT t.*, tm.role as my_role
     FROM teams t
     JOIN team_members tm ON tm.team_id = t.id
     WHERE tm.user_id = ?
     ORDER BY t.created_at DESC`
  ).bind(userId).all()
  return result.results as Array<Record<string, unknown>>
}

export async function getTeam(
  db: D1Database,
  teamId: string
): Promise<Record<string, unknown> | null> {
  return await db.prepare('SELECT * FROM teams WHERE id = ?').bind(teamId).first()
}

export async function getTeamMembers(
  db: D1Database,
  teamId: string
): Promise<Array<Record<string, unknown>>> {
  const result = await db.prepare(
    `SELECT tm.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = ?
     ORDER BY tm.joined_at ASC`
  ).bind(teamId).all()
  return result.results as Array<Record<string, unknown>>
}

export async function getTeamMember(
  db: D1Database,
  teamId: string,
  userId: string
): Promise<{ role: string } | null> {
  return await db.prepare(
    'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
  ).bind(teamId, userId).first()
}

export async function updateTeam(
  db: D1Database,
  teamId: string,
  data: { name?: string; description?: string }
): Promise<void> {
  const sets: string[] = ['updated_at = datetime(\'now\')']
  const params: unknown[] = []
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name) }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description) }
  params.push(teamId)
  await db.prepare(`UPDATE teams SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
}

export async function deleteTeam(db: D1Database, teamId: string): Promise<void> {
  await db.prepare('DELETE FROM teams WHERE id = ?').bind(teamId).run()
}

export async function addTeamMember(
  db: D1Database,
  teamId: string,
  userId: string,
  role: string,
  invitedBy?: string
): Promise<Record<string, unknown>> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.prepare(
    `INSERT INTO team_members (id, team_id, user_id, role, invited_by, joined_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, teamId, userId, role, invitedBy ?? null, now).run()
  return { id, team_id: teamId, user_id: userId, role, joined_at: now }
}

export async function removeTeamMember(
  db: D1Database,
  teamId: string,
  userId: string
): Promise<void> {
  await db.prepare(
    'DELETE FROM team_members WHERE team_id = ? AND user_id = ?'
  ).bind(teamId, userId).run()
}

export async function createTeamInvite(
  db: D1Database,
  teamId: string,
  invitedBy: string,
  email: string,
  role: string
): Promise<Record<string, unknown>> {
  const id = crypto.randomUUID()
  const token = crypto.randomUUID()
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await db.prepare(
    `INSERT INTO team_invites (id, team_id, email, role, token, invited_by, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, teamId, email, role, token, invitedBy, expiresAt, now).run()
  return { id, team_id: teamId, email, role, token, invited_by: invitedBy, expires_at: expiresAt, created_at: now }
}

export async function listTeamInvites(
  db: D1Database,
  teamId: string
): Promise<Array<Record<string, unknown>>> {
  const result = await db.prepare(
    `SELECT * FROM team_invites
     WHERE team_id = ? AND accepted_at IS NULL AND expires_at > datetime('now')
     ORDER BY created_at DESC`
  ).bind(teamId).all()
  return result.results as Array<Record<string, unknown>>
}

export async function deleteTeamInvite(
  db: D1Database,
  inviteId: string
): Promise<void> {
  await db.prepare('DELETE FROM team_invites WHERE id = ?').bind(inviteId).run()
}

export async function getTeamInviteByToken(
  db: D1Database,
  token: string
): Promise<Record<string, unknown> | null> {
  return await db.prepare(
    'SELECT * FROM team_invites WHERE token = ?'
  ).bind(token).first()
}

export async function acceptTeamInvite(
  db: D1Database,
  inviteId: string
): Promise<void> {
  await db.prepare(
    `UPDATE team_invites SET accepted_at = datetime('now') WHERE id = ?`
  ).bind(inviteId).run()
}

export { parseTags, parseJson, toJson }

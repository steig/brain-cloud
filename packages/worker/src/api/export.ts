import { Hono } from 'hono'
import type { Env, Variables } from '../types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

type ExportType = 'thoughts' | 'decisions' | 'sessions' | 'sentiment' | 'all'
type ExportFormat = 'json' | 'csv'

const VALID_TYPES = new Set<ExportType>(['thoughts', 'decisions', 'sessions', 'sentiment', 'all'])
const VALID_FORMATS = new Set<ExportFormat>(['json', 'csv'])
const VALID_RANGES: Record<string, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  'all': null,
}

// CSV escaping: wrap in quotes if field contains comma, quote, or newline; double internal quotes
function csvEscape(value: unknown): string {
  if (value == null) return ''
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsvRows(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.map(csvEscape).join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => csvEscape(row[h])).join(','))
  }
  return lines.join('\n')
}

function dateNDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

async function queryType(
  db: D1Database,
  userId: string,
  type: ExportType,
  rangeDays: number | null,
): Promise<Record<string, Record<string, unknown>[]>> {
  const dateFilter = rangeDays != null ? dateNDaysAgo(rangeDays) : null
  const dateClause = dateFilter ? ' AND created_at >= ?' : ''
  const dateClauseSession = dateFilter ? ' AND started_at >= ?' : ''
  const result: Record<string, Record<string, unknown>[]> = {}

  if (type === 'thoughts' || type === 'all') {
    const binds: unknown[] = [userId]
    if (dateFilter) binds.push(dateFilter)
    const { results } = await db.prepare(
      `SELECT id, type, content, tags, context, visibility, ai_model, project_id, created_at
       FROM thoughts WHERE user_id = ? AND deleted_at IS NULL${dateClause}
       ORDER BY created_at DESC`
    ).bind(...binds).all()
    result.thoughts = results as Record<string, unknown>[]
  }

  if (type === 'decisions' || type === 'all') {
    const binds: unknown[] = [userId]
    if (dateFilter) binds.push(dateFilter)
    const { results } = await db.prepare(
      `SELECT id, title, context, options, chosen, rationale, outcome, tags, ai_model, project_id, created_at, updated_at
       FROM decisions WHERE user_id = ? AND deleted_at IS NULL${dateClause}
       ORDER BY created_at DESC`
    ).bind(...binds).all()
    result.decisions = results as Record<string, unknown>[]
  }

  if (type === 'sessions' || type === 'all') {
    const binds: unknown[] = [userId]
    if (dateFilter) binds.push(dateFilter)
    const { results } = await db.prepare(
      `SELECT id, started_at, ended_at, mood_start, mood_end, goals, accomplishments, blockers, summary, metadata, ai_model, project_id
       FROM sessions WHERE user_id = ?${dateClauseSession}
       ORDER BY started_at DESC`
    ).bind(...binds).all()
    result.sessions = results as Record<string, unknown>[]
  }

  if (type === 'sentiment' || type === 'all') {
    const binds: unknown[] = [userId]
    if (dateFilter) binds.push(dateFilter)
    const { results } = await db.prepare(
      `SELECT id, target_type, target_name, feeling, intensity, reason, ai_model, project_id, created_at
       FROM sentiment WHERE user_id = ?${dateClause}
       ORDER BY created_at DESC`
    ).bind(...binds).all()
    result.sentiment = results as Record<string, unknown>[]
  }

  return result
}

// GET /api/export
app.get('/', async (c) => {
  const user = c.get('user')
  const url = new URL(c.req.url)

  const format = (url.searchParams.get('format') || 'json') as ExportFormat
  const type = (url.searchParams.get('type') || 'all') as ExportType
  const range = url.searchParams.get('range') || 'all'

  if (!VALID_FORMATS.has(format)) {
    return c.json({ error: `Invalid format. Must be one of: ${[...VALID_FORMATS].join(', ')}` }, 400)
  }
  if (!VALID_TYPES.has(type)) {
    return c.json({ error: `Invalid type. Must be one of: ${[...VALID_TYPES].join(', ')}` }, 400)
  }
  if (!(range in VALID_RANGES)) {
    return c.json({ error: `Invalid range. Must be one of: ${Object.keys(VALID_RANGES).join(', ')}` }, 400)
  }

  const rangeDays = VALID_RANGES[range]
  const data = await queryType(c.env.DB, user.id, type, rangeDays)
  const filename = `${type}-${todayStr()}.${format}`

  if (format === 'json') {
    // For single type, return array; for "all", return object with keys per type
    const body = type === 'all' ? data : data[type]
    return c.json(body, 200, {
      'Content-Disposition': `attachment; filename="${filename}"`,
    })
  }

  // CSV format
  let csvBody: string
  if (type === 'all') {
    // Concatenate all types with section headers
    const sections: string[] = []
    for (const [typeName, rows] of Object.entries(data)) {
      sections.push(`# ${typeName}`)
      sections.push(toCsvRows(rows as Record<string, unknown>[]))
    }
    csvBody = sections.join('\n\n')
  } else {
    csvBody = toCsvRows(data[type] as Record<string, unknown>[])
  }

  return c.body(csvBody, 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  })
})

export { app as exportRoutes }

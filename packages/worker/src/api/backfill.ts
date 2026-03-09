import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { upsertEmbedding } from '../db/vectorize'
import { adminGuard } from '../middleware/admin-guard'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.use('*', adminGuard)

app.post('/vectorize', async (c) => {

  if (!c.env.VECTORIZE) {
    return c.json({ error: 'Vectorize not configured' }, 503)
  }

  const body = await c.req.json<{ batch_size?: number; type?: string }>().catch(
    () => ({}) as { batch_size?: number; type?: string },
  )
  const batchSize = Math.min(body.batch_size ?? 50, 100)
  const typeFilter = body.type

  let processedThoughts = 0
  let processedDecisions = 0
  let errors = 0

  // Backfill thoughts
  if (!typeFilter || typeFilter === 'thought') {
    let offset = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { results: thoughts } = await c.env.DB.prepare(
        'SELECT id, content, user_id, project_id, created_at FROM thoughts ORDER BY created_at LIMIT ? OFFSET ?',
      ).bind(batchSize, offset).all<{ id: string; content: string; user_id: string; project_id: string | null; created_at: string }>()

      if (thoughts.length === 0) break

      const results = await Promise.allSettled(
        thoughts.map((t) =>
          upsertEmbedding(c.env, t.id, t.content, {
            type: 'thought',
            userId: t.user_id,
            projectId: t.project_id ?? undefined,
            createdAt: t.created_at,
          }),
        ),
      )
      for (const r of results) {
        if (r.status === 'fulfilled') processedThoughts++
        else { errors++; console.error('[backfill] thought failed:', r.reason) }
      }
      console.log(`[backfill] thoughts offset ${offset}: ${processedThoughts} done`)
      offset += batchSize
      if (thoughts.length < batchSize) break
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  // Backfill decisions
  if (!typeFilter || typeFilter === 'decision') {
    let offset = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { results: decisions } = await c.env.DB.prepare(
        'SELECT id, title, chosen, rationale, user_id, project_id, created_at FROM decisions ORDER BY created_at LIMIT ? OFFSET ?',
      ).bind(batchSize, offset).all<{
        id: string; title: string; chosen: string; rationale: string
        user_id: string; project_id: string | null; created_at: string
      }>()

      if (decisions.length === 0) break

      const results = await Promise.allSettled(
        decisions.map((d) =>
          upsertEmbedding(c.env, d.id, `${d.title} ${d.chosen} ${d.rationale}`, {
            type: 'decision',
            userId: d.user_id,
            projectId: d.project_id ?? undefined,
            createdAt: d.created_at,
          }),
        ),
      )
      for (const r of results) {
        if (r.status === 'fulfilled') processedDecisions++
        else { errors++; console.error('[backfill] decision failed:', r.reason) }
      }
      console.log(`[backfill] decisions offset ${offset}: ${processedDecisions} done`)
      offset += batchSize
      if (decisions.length < batchSize) break
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  return c.json({ success: true, processed: { thoughts: processedThoughts, decisions: processedDecisions }, errors })
})

export { app as backfillRoutes }

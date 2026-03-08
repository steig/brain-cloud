import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { upsertEmbedding } from '../db/vectorize'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.post('/vectorize', async (c) => {
  const user = c.get('user')
  if (user.system_role !== 'admin' && user.system_role !== 'super_admin') {
    return c.json({ error: 'Admin access required' }, 403)
  }

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
    const { results: thoughts } = await c.env.DB.prepare(
      'SELECT id, content, user_id, project_id, created_at FROM thoughts ORDER BY created_at',
    ).all<{ id: string; content: string; user_id: string; project_id: string | null; created_at: string }>()

    for (let i = 0; i < thoughts.length; i += batchSize) {
      const batch = thoughts.slice(i, i + batchSize)
      for (const t of batch) {
        try {
          await upsertEmbedding(c.env, t.id, t.content, {
            type: 'thought',
            userId: t.user_id,
            projectId: t.project_id ?? undefined,
            createdAt: t.created_at,
          })
          processedThoughts++
        } catch (e) {
          errors++
          console.error(`[backfill] thought ${t.id} failed:`, e)
        }
      }
      console.log(
        `[backfill] thoughts batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(thoughts.length / batchSize)}: ${processedThoughts} done`,
      )
      if (i + batchSize < thoughts.length) await new Promise((r) => setTimeout(r, 100))
    }
  }

  // Backfill decisions
  if (!typeFilter || typeFilter === 'decision') {
    const { results: decisions } = await c.env.DB.prepare(
      'SELECT id, title, chosen, rationale, user_id, project_id, created_at FROM decisions ORDER BY created_at',
    ).all<{
      id: string
      title: string
      chosen: string
      rationale: string
      user_id: string
      project_id: string | null
      created_at: string
    }>()

    for (let i = 0; i < decisions.length; i += batchSize) {
      const batch = decisions.slice(i, i + batchSize)
      for (const d of batch) {
        try {
          await upsertEmbedding(c.env, d.id, `${d.title} ${d.chosen} ${d.rationale}`, {
            type: 'decision',
            userId: d.user_id,
            projectId: d.project_id ?? undefined,
            createdAt: d.created_at,
          })
          processedDecisions++
        } catch (e) {
          errors++
          console.error(`[backfill] decision ${d.id} failed:`, e)
        }
      }
      console.log(
        `[backfill] decisions batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(decisions.length / batchSize)}: ${processedDecisions} done`,
      )
      if (i + batchSize < decisions.length) await new Promise((r) => setTimeout(r, 100))
    }
  }

  return c.json({ success: true, processed: { thoughts: processedThoughts, decisions: processedDecisions }, errors })
})

export { app as backfillRoutes }

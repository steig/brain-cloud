import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { vectorSearch } from '../db/vectorize'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.post('/', async (c) => {
  const user = c.get('user')
  const { question, history } = await c.req.json<{
    question: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  }>()

  if (!question?.trim()) return c.json({ error: 'Question is required' }, 400)
  if (question.length > 2000) return c.json({ error: 'Question too long' }, 400)

  // 1. Search for relevant context
  const results = await vectorSearch(c.env, question, user.id, { limit: 10 })

  // 2. Fetch full records for context
  let contextEntries: Array<{ id: string; type: string; content: string; created_at: string }> = []

  if (results.length > 0) {
    const ids = results.map((r) => r.id)
    const placeholders = ids.map(() => '?').join(',')

    const [thoughts, decisions] = await Promise.all([
      c.env.DB.prepare(
        `SELECT id, 'thought' as type, content, created_at FROM thoughts WHERE id IN (${placeholders}) AND user_id = ?`,
      )
        .bind(...ids, user.id)
        .all(),
      c.env.DB.prepare(
        `SELECT id, 'decision' as type, title || ': ' || chosen || '. ' || rationale as content, created_at FROM decisions WHERE id IN (${placeholders}) AND user_id = ?`,
      )
        .bind(...ids, user.id)
        .all(),
    ])

    contextEntries = [
      ...((thoughts.results ?? []) as Array<{ id: string; type: string; content: string; created_at: string }>),
      ...((decisions.results ?? []) as Array<{ id: string; type: string; content: string; created_at: string }>),
    ]
      .sort((a, b) => {
        const scoreA = results.find((r) => r.id === a.id)?.score ?? 0
        const scoreB = results.find((r) => r.id === b.id)?.score ?? 0
        return scoreB - scoreA
      })
      .slice(0, 8)
  }

  // 3. Build RAG prompt
  const contextBlock =
    contextEntries.length > 0
      ? contextEntries.map((e, i) => `[${i + 1}] (${e.type}, ${e.created_at}): ${e.content}`).join('\n\n')
      : 'No relevant entries found in your brain.'

  const systemPrompt = `You are a helpful AI assistant that answers questions based on the user's personal knowledge base ("brain"). Use the context entries below to answer. Cite sources using [1], [2], etc. If the context doesn't contain enough information, say so honestly. Keep answers concise and direct.

CONTEXT ENTRIES:
${contextBlock}`

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  // Add conversation history (last 6 turns max)
  if (history?.length) {
    for (const msg of history.slice(-6)) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }
  messages.push({ role: 'user', content: question })

  // 4. Get response from Workers AI (non-streaming for reliability)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiResponse = (await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
    messages,
    stream: false,
  })) as { response: string }

  return c.json({
    answer: aiResponse.response,
    sources: contextEntries.map((e, i) => ({
      index: i + 1,
      id: e.id,
      type: e.type,
      content: e.content.slice(0, 200),
      created_at: e.created_at,
    })),
  })
})

export { app as askRoutes }

/**
 * Per-user AI cost modeling for Workers AI usage.
 *
 * Tracks embedding, coaching, digest, and RAG operations with estimated costs
 * based on Workers AI pricing. Stored in the `ai_usage` table (one row per event).
 *
 * ── Cost Projections ──────────────────────────────────────────────────
 *
 * Workers AI pricing (as of 2025):
 *   - bge-base-en-v1.5 embeddings: ~$0.011 / 1M tokens
 *   - Text generation (llama-3.1-8b class): input $0.01 / 1M tokens, output $0.04 / 1M tokens
 *
 * Assumptions per operation:
 *   - Embedding: ~500 tokens avg per request → ~$0.0000055/request
 *   - Coaching/digest generation: ~2000 input + ~1000 output tokens
 *   - RAG query (rewrite): ~200 input + ~100 output tokens
 *   - RAG generation (answer): ~3000 input + ~500 output tokens
 *
 * Light user (10 entries/day, 5 searches/day):
 *   - Embeddings: 10 × $0.0000055 × 30 = $0.00165/month
 *   - RAG queries: 5 × $0.000006 × 30 = $0.0009/month
 *   - RAG generation: 5 × $0.00005 × 30 = $0.0075/month
 *   - Coaching/digest: 2 × $0.00006 × 30 = $0.0036/month
 *   - Total: ~$0.013/month
 *
 * Moderate user (50 entries/day, 20 searches/day):
 *   - Embeddings: 50 × $0.0000055 × 30 = $0.00825/month
 *   - RAG queries: 20 × $0.000006 × 30 = $0.0036/month
 *   - RAG generation: 20 × $0.00005 × 30 = $0.03/month
 *   - Coaching/digest: 2 × $0.00006 × 30 = $0.0036/month
 *   - Total: ~$0.045/month
 *
 * Heavy user (200 entries/day, 50 searches/day):
 *   - Embeddings: 200 × $0.0000055 × 30 = $0.033/month
 *   - RAG queries: 50 × $0.000006 × 30 = $0.009/month
 *   - RAG generation: 50 × $0.00005 × 30 = $0.075/month
 *   - Coaching/digest: 2 × $0.00006 × 30 = $0.0036/month
 *   - Total: ~$0.12/month
 *
 * Cost-dominant operation: RAG generation (text gen with large context windows).
 * Embeddings are negligibly cheap even at high volume.
 * ──────────────────────────────────────────────────────────────────────
 */

/** Workers AI pricing (approximate, per token or per request) */
const AI_COSTS = {
  // Embedding: bge-base-en-v1.5 — $0.011 per 1M tokens
  embedding: { perRequest: 0.0000055 }, // ~500 tokens avg per embed
  // Text generation (for coaching/digest/RAG) — varies by model
  textGeneration: { perInputToken: 0.00000001, perOutputToken: 0.00000004 },
} as const

export type AiOperation = 'embedding' | 'coaching' | 'digest' | 'rag_query' | 'rag_generation'

export interface AiUsageEvent {
  userId: string
  operation: AiOperation
  inputTokens?: number
  outputTokens?: number
  model: string
}

/** Track an AI usage event in the ai_usage table */
export async function trackAiUsage(db: D1Database, event: AiUsageEvent): Promise<void> {
  const estimatedCost = event.operation === 'embedding'
    ? AI_COSTS.embedding.perRequest
    : (event.inputTokens ?? 0) * AI_COSTS.textGeneration.perInputToken +
      (event.outputTokens ?? 0) * AI_COSTS.textGeneration.perOutputToken

  await db.prepare(
    `INSERT INTO ai_usage (id, user_id, operation, model, input_tokens, output_tokens, estimated_cost, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    crypto.randomUUID(),
    event.userId,
    event.operation,
    event.model,
    event.inputTokens ?? 0,
    event.outputTokens ?? 0,
    estimatedCost,
  ).run()
}

export interface CostSummary {
  total_cost: number
  by_operation: Record<string, { count: number; cost: number }>
  daily_avg: number
}

/** Get cost summary for a user over a period */
export async function getUserCostSummary(
  db: D1Database,
  userId: string,
  days: number = 30,
): Promise<CostSummary> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { results } = await db.prepare(
    `SELECT operation, COUNT(*) as count, SUM(estimated_cost) as total_cost
     FROM ai_usage WHERE user_id = ? AND created_at >= ?
     GROUP BY operation`
  ).bind(userId, since).all<{ operation: string; count: number; total_cost: number }>()

  const byOperation: Record<string, { count: number; cost: number }> = {}
  let totalCost = 0
  for (const row of results) {
    byOperation[row.operation] = { count: row.count, cost: row.total_cost }
    totalCost += row.total_cost
  }

  return {
    total_cost: totalCost,
    by_operation: byOperation,
    daily_avg: totalCost / Math.max(days, 1),
  }
}

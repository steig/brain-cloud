import type { Env } from '../types'

const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5'
const MIN_SEMANTIC_SCORE = 0.65

interface EmbeddingMetadata {
  type: 'thought' | 'decision'
  userId: string
  projectId?: string
  createdAt: string
}

/** Generate embedding for text using Workers AI */
export async function generateEmbedding(ai: Ai, text: string): Promise<number[]> {
  const result = await ai.run(EMBEDDING_MODEL, { text: [text] })
  // Result is a union type; the sync response has `data`
  const output = result as { data?: number[][] }
  if (!output.data?.[0]) throw new Error('No embedding returned from Workers AI')
  return output.data[0]
}

/** Upsert a thought/decision embedding into Vectorize */
export async function upsertEmbedding(
  env: Env,
  id: string,
  text: string,
  metadata: EmbeddingMetadata,
): Promise<void> {
  if (!env.VECTORIZE || !env.AI) return // graceful fallback
  const values = await generateEmbedding(env.AI, text)
  // Convert metadata to Record<string, VectorizeVectorMetadataValue>
  const vecMetadata: Record<string, string> = {
    type: metadata.type,
    userId: metadata.userId,
    createdAt: metadata.createdAt,
  }
  if (metadata.projectId) vecMetadata.projectId = metadata.projectId
  await env.VECTORIZE.upsert([{ id, values, metadata: vecMetadata }])
}

/** Delete embedding from Vectorize */
export async function deleteEmbedding(env: Env, id: string): Promise<void> {
  if (!env.VECTORIZE) return
  await env.VECTORIZE.deleteByIds([id])
}

/** Search Vectorize for similar entries, filtered by userId */
export async function vectorSearch(
  env: Env,
  query: string,
  userId: string,
  options: { limit?: number; type?: 'thought' | 'decision' } = {},
): Promise<Array<{ id: string; score: number }>> {
  if (!env.VECTORIZE || !env.AI) return []
  const limit = options.limit ?? 20

  const queryVector = await generateEmbedding(env.AI, query)

  const filter: VectorizeVectorMetadataFilter = { userId }
  if (options.type) filter.type = options.type

  const results = await env.VECTORIZE.query(queryVector, {
    topK: limit,
    filter,
    returnMetadata: 'none',
  })

  // filter matches by score before returning
  return results.matches
    .filter((m) => m.score >= MIN_SEMANTIC_SCORE)
    .map((m) => ({ id: m.id, score: m.score }))
}

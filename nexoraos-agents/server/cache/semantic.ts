/**
 * NexoraOS Semantic Cache — pgvector cosine similarity via Supabase RPC.
 * Cache failures are always non-fatal; a hit-count update failure never
 * turns a valid hit into a miss.
 */
import crypto from 'node:crypto'
import { getSupabaseClient } from '../db/client.js'
import { EMBEDDING_MODEL } from '../model/loader.js'
import type { AgentId } from '../../shared/types.js'

const SIMILARITY_THRESHOLD = 0.92
const MODEL_URL = (process.env.LOCAL_MODEL_URL || 'http://localhost:8000/v1').replace(/\/$/, '')

export interface CachedResponse {
  query: string
  response: string
  agentId: AgentId
  embedding: number[]
  hitCount: number
  createdAt: string
}

export function buildScopeKey(agentId: AgentId, model: string, temperature: number): string {
  const data = JSON.stringify({ agentId, model, temperature })
  return crypto.createHash('sha256').update(data).digest('hex')
}

async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(`${MODEL_URL}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    })
    if (!response.ok) return null
    const data = await response.json() as { data?: Array<{ embedding: number[] }> }
    return data.data?.[0]?.embedding ?? null
  } catch { return null }
}

export async function cacheGet(query: string, agentId: AgentId, scopeKey: string): Promise<string | null> {
  try {
    const embedding = await getEmbedding(query)
    if (!embedding) return null

    const { data } = await getSupabaseClient().rpc('semantic_cache_lookup', {
      query_embedding: embedding,
      scope_key: scopeKey,
      similarity_threshold: SIMILARITY_THRESHOLD,
      match_count: 1,
    })
    if (!data?.length) return null

    // Hit counting is best-effort and must never invalidate the hit itself.
    getSupabaseClient()
      .from('semantic_cache')
      .update({ hit_count: (data[0].hit_count ?? 0) + 1 })
      .eq('id', data[0].id)
      .then(({ error }) => { if (error) console.error('cache hit_count update failed:', error.message) })

    return data[0].response as string
  } catch { return null }
}

export async function cacheSet(query: string, response: string, agentId: AgentId, scopeKey: string): Promise<void> {
  try {
    const embedding = await getEmbedding(query)
    if (!embedding) return
    await getSupabaseClient().from('semantic_cache').insert({
      query,
      response,
      agent_id: agentId,
      scope_key: scopeKey,
      embedding,
      hit_count: 0,
      created_at: new Date().toISOString(),
    })
  } catch { /* cache write failure is non-fatal */ }
}

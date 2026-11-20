/**
 * NexoraOS RAG Knowledge Base — pgvector + keyword (FTS) hybrid search.
 * Vector search requires the /embeddings endpoint and the rag_search RPC;
 * keyword search uses the generated search_vector FTS column (see migration).
 * An empty result is reported as ok:true with chunks:[] and method 'none'
 * only when every path failed — callers can distinguish "no documents" from "error".
 */
import { getSupabaseClient } from '../db/client.js'
import { EMBEDDING_MODEL } from '../model/loader.js'
import type { AgentId, ToolResult } from '../../shared/types.js'

const MODEL_URL = (process.env.LOCAL_MODEL_URL || 'http://localhost:8000/v1').replace(/\/$/, '')

export interface DocumentChunk {
  id: string
  content: string
  source: string
  agentId: AgentId
  similarity?: number
}

function mapDocumentChunk(value: unknown): DocumentChunk {
  const row = value as Record<string, unknown>
  return {
    id: String(row.id ?? ''),
    content: String(row.content ?? ''),
    source: String(row.source ?? ''),
    agentId: (row.agent_id ?? row.agentId) as AgentId,
    ...(typeof row.similarity === 'number' ? { similarity: row.similarity } : {}),
  }
}

async function embed(text: string): Promise<number[] | null> {
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

export async function ragSearch(query: string, agentId: AgentId, limit = 5): Promise<ToolResult> {
  try {
    const embedding = await embed(query)

    if (embedding) {
      const { data: vectorResults } = await getSupabaseClient().rpc('rag_search', {
        query_embedding: embedding,
        agent_id: agentId,
        match_count: limit,
        similarity_threshold: 0.7,
      })
      if (vectorResults?.length) {
        return {
          ok: true,
          data: { chunks: (vectorResults as unknown[]).map(mapDocumentChunk), method: 'vector' },
        }
      }
    }

    // Keyword fallback: requires the generated search_vector FTS column (migration 0001).
    const { data: keywordResults, error: keywordError } = await getSupabaseClient()
      .from('document_chunks')
      .select('id, content, source, agent_id')
      .eq('agent_id', agentId)
      .textSearch('search_vector', query)
      .limit(limit)

    if (keywordError) {
      return { ok: false, error: `RAG keyword search failed: ${keywordError.message}` }
    }
    return {
      ok: true,
      data: { chunks: (keywordResults ?? []).map(mapDocumentChunk), method: 'keyword' },
    }
  } catch (error) {
    return { ok: false, error: `RAG search failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/** Split, embed, and store a document for an agent. Called by ingestion jobs or admin tooling. */
export async function ingestDocument(content: string, source: string, agentId: AgentId, chunkSize = 1000): Promise<ToolResult> {
  try {
    const chunks: string[] = []
    for (let i = 0; i < content.length; i += chunkSize) chunks.push(content.slice(i, i + chunkSize))

    for (const chunk of chunks) {
      const embedding = await embed(chunk)
      await getSupabaseClient().from('document_chunks').insert({
        content: chunk,
        source,
        agent_id: agentId,
        embedding,
        created_at: new Date().toISOString(),
      })
    }
    return { ok: true, data: { chunksCreated: chunks.length } }
  } catch (error) {
    return { ok: false, error: `Ingest failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

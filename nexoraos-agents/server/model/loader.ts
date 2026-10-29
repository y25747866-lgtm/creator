/**
 * NexoraOS Model Loader — OpenAI-compatible endpoint (vLLM / llama.cpp / any compatible server).
 * All agents call complete(); parseModelJson() provides fence-tolerant JSON extraction.
 */
import type { ModelConfig } from '../../shared/types.js'

const MODEL_CONFIG: ModelConfig = {
  modelPath: process.env.MODEL_PATH || '/workspace/DeepSeek-V4.1-Flash-INT4',
  contextLength: 128000,
  temperature: 0.7,
  maxTokens: 8192,
}

const LOCAL_MODEL_URL = (process.env.LOCAL_MODEL_URL || 'http://localhost:8000/v1').replace(/\/$/, '')
/** Model identifier sent to the endpoint. Configurable because the server verifies the actual served id at /health. */
export const MODEL_NAME = process.env.MODEL_NAME || 'DeepSeek-V4.1-Flash'
/** Embeddings may be served under a different name on the same endpoint. */
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || MODEL_NAME

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  name?: string
}

export interface CompletionOptions {
  messages: ChatMessage[]
  tools?: unknown[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
  signal?: AbortSignal
}

export interface CompletionResult {
  content: string
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>
  usage?: { inputTokens: number; outputTokens: number }
}

export async function complete(options: CompletionOptions): Promise<CompletionResult> {
  const response = await fetch(`${LOCAL_MODEL_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: options.messages,
      tools: options.tools,
      temperature: options.temperature ?? MODEL_CONFIG.temperature,
      max_tokens: options.maxTokens ?? MODEL_CONFIG.maxTokens,
      stream: false,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Model error: ${response.status} ${detail.slice(0, 200)}`)
  }

  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string
        tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>
      }
    }>
    usage?: { prompt_tokens: number; completion_tokens: number }
  }

  const message = data.choices?.[0]?.message
  if (!message) throw new Error('Model returned an empty choices array')

  let toolCalls: CompletionResult['toolCalls']
  if (message.tool_calls) {
    toolCalls = message.tool_calls.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: safeParseArgs(tc.function.arguments),
    }))
  }

  return {
    content: message.content || '',
    toolCalls,
    usage: data.usage
      ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
      : undefined,
  }
}

function safeParseArgs(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown> } catch { return {} }
}

/** Extract JSON from model output tolerating markdown fences and surrounding prose. */
export function parseModelJson<T = unknown>(content: string): { ok: true; value: T } | { ok: false; raw: string } {
  if (!content || !content.trim()) return { ok: false, raw: content ?? '' }
  let cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  const candidate = start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned
  try {
    return { ok: true, value: JSON.parse(candidate) as T }
  } catch {
    return { ok: false, raw: content }
  }
}

export interface ModelStatus {
  ready: boolean
  servedModelId?: string
  error?: string
}

/** Health probe: verifies the endpoint is up AND which model id it actually serves. */
export async function getModelStatus(): Promise<ModelStatus> {
  try {
    const response = await fetch(`${LOCAL_MODEL_URL}/models`, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return { ready: false, error: `HTTP ${response.status}` }
    const data = await response.json() as { data?: Array<{ id?: string }> }
    const served = data.data?.[0]?.id
    if (!served) return { ready: false, error: 'endpoint returned no models' }
    return { ready: true, servedModelId: served }
  } catch (error) {
    return { ready: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** Backward-compatible boolean check. */
export async function modelReady(): Promise<boolean> {
  return (await getModelStatus()).ready
}

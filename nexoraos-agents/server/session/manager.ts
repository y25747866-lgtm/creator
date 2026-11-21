/**
 * NexoraOS Session Manager.
 * Appends are atomic via the append_session_message RPC (see migrations);
 * falls back to read-modify-write only if the RPC is missing.
 */
import { randomUUID } from 'node:crypto'
import { getSupabaseClient } from '../db/client.js'
import type { ChatMessage } from '../model/loader.js'
import type { AgentId } from '../../shared/types.js'

const IDLE_TIMEOUT_MINUTES = 30
/** Hard cap on messages loaded into the model context from a session. */
export const MAX_HISTORY_MESSAGES = 40

export interface AgentSession {
  id: string
  userId: string
  agentId: AgentId
  messages: ChatMessage[]
  status: 'active' | 'ended'
  idleExpiresAt: string
  createdAt: string
}

export async function createSession(userId: string, agentId: AgentId, systemPrompt: string): Promise<AgentSession> {
  const session: AgentSession = {
    id: randomUUID(),
    userId,
    agentId,
    messages: [{ role: 'system', content: systemPrompt }],
    status: 'active',
    idleExpiresAt: new Date(Date.now() + IDLE_TIMEOUT_MINUTES * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  }

  const { error } = await getSupabaseClient().from('agent_sessions').insert({
    id: session.id,
    user_id: session.userId,
    agent_id: session.agentId,
    messages: session.messages,
    status: session.status,
    idle_expires_at: session.idleExpiresAt,
    created_at: session.createdAt,
  })
  if (error) throw new Error(`Failed to create agent session: ${error.message}`)
  return session
}

export async function getSession(userId: string, agentId: AgentId): Promise<AgentSession | null> {
  const { data, error } = await getSupabaseClient()
    .from('agent_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .gt('idle_expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return {
    id: data.id,
    userId: data.user_id,
    agentId: data.agent_id,
    messages: (data.messages as ChatMessage[]).slice(-MAX_HISTORY_MESSAGES),
    status: data.status,
    idleExpiresAt: data.idle_expires_at,
    createdAt: data.created_at,
  } as AgentSession
}

export async function appendMessage(sessionId: string, message: ChatMessage): Promise<void> {
  const supabase = getSupabaseClient()
  const { error: rpcError } = await supabase.rpc('append_session_message', {
    p_session_id: sessionId,
    p_message: message,
    p_idle_minutes: IDLE_TIMEOUT_MINUTES,
  })
  if (!rpcError) return

  // Fallback when the RPC is not installed: read-modify-write (non-atomic).
  const { data } = await supabase.from('agent_sessions').select('messages').eq('id', sessionId).single()
  if (!data) return
  const messages = [...(data.messages as ChatMessage[]), message]
  await supabase.from('agent_sessions').update({
    messages,
    idle_expires_at: new Date(Date.now() + IDLE_TIMEOUT_MINUTES * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', sessionId)
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data } = await getSupabaseClient()
    .from('agent_sessions')
    .select('messages')
    .eq('id', sessionId)
    .single()
  return ((data?.messages as ChatMessage[]) ?? []).slice(-MAX_HISTORY_MESSAGES)
}

export async function endSession(sessionId: string, reason: 'closed' | 'idle_timeout' | 'error' = 'closed'): Promise<void> {
  await getSupabaseClient().from('agent_sessions').update({
    status: 'ended',
    end_reason: reason,
    ended_at: new Date().toISOString(),
  }).eq('id', sessionId)
}

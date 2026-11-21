/**
 * NexoraOS Event Bus — best-effort persistence, in-memory delivery always.
 * A failed event insert must never change agent execution outcomes.
 */
import { randomUUID } from 'node:crypto'
import { getSupabaseClient } from '../db/client.js'
import type { RuntimeEvent, AgentId, AgentStatus, EventType } from '../../shared/types.js'

const subscribers = new Map<string, (event: RuntimeEvent) => void>()

export function subscribe(taskId: string, cb: (event: RuntimeEvent) => void) {
  subscribers.set(taskId, cb)
  return () => { subscribers.delete(taskId) }
}

export async function emit(agentId: AgentId, taskId: string, type: EventType, payload?: Record<string, unknown>) {
  const event: RuntimeEvent = {
    eventId: randomUUID(),
    agentId,
    taskId,
    type,
    payload,
    createdAt: new Date().toISOString(),
  }

  // In-memory SSE subscribers are always notified.
  try { subscribers.get(taskId)?.(event) } catch (e) { console.error('SSE subscriber error:', e) }

  // Supabase persistence is best-effort; failures are logged, never thrown.
  try {
    const { error } = await getSupabaseClient().from('agent_events').insert({
      event_id: event.eventId,
      agent_id: event.agentId,
      task_id: event.taskId,
      type: event.type,
      payload: event.payload ?? null,
      created_at: event.createdAt,
    })
    if (error) console.error(`Failed to persist agent event ${type}:`, error.message)
  } catch (e) {
    console.error('agent_events persistence failed:', e instanceof Error ? e.message : String(e))
  }
}

/** Update task status — this one is real state and DOES throw on failure. */
export async function setAgentStatus(agentId: AgentId, taskId: string, status: AgentStatus) {
  const { error } = await getSupabaseClient()
    .from('agent_tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('agent', agentId)
  if (error) throw new Error(`Failed to update agent task status: ${error.message}`)
  await emit(agentId, taskId, 'agent.status', { status })
}

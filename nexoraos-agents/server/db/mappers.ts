import type { AgentTask, AgentStatus, AgentId } from '../../shared/types.js'

/**
 * Convert the agent_tasks row shape implied by existing snake_case filters and
 * inserts into the in-process camelCase AgentTask contract. Live schema remains
 * unverified until a Supabase project is available.
 */
export function mapAgentTaskRow(value: unknown): AgentTask {
  if (!value || typeof value !== 'object') throw new Error('Invalid agent_tasks row')
  const row = value as Record<string, unknown>
  const task: AgentTask = {
    id: String(row.id ?? ''),
    userId: String(row.user_id ?? ''),
    goal: String(row.goal ?? ''),
    agent: row.agent as AgentId,
    status: row.status as AgentStatus,
    input: row.input as Record<string, unknown> | undefined,
    output: row.output as Record<string, unknown> | undefined,
    parentTaskId: typeof row.parent_task_id === 'string' ? row.parent_task_id : undefined,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
  if (!task.id || !task.userId || !task.goal || !task.createdAt || !task.updatedAt) {
    throw new Error('agent_tasks row is missing a required snake_case column')
  }
  return task
}

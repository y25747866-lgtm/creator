/**
 * NexoraOS Hybrid Agent System — Shared Types
 * Adapted from OpenMausBot runtime-events.ts + OpenDots types.ts
 */

export type AgentId = 'nexus' | 'scout' | 'flux' | 'apex' | 'forge'

export type AgentStatus =
  | 'idle'
  | 'queued'
  | 'thinking'
  | 'working'
  | 'waiting'
  | 'success'
  | 'error'

export type EventType =
  | 'session.started'
  | 'session.exited'
  | 'turn.started'
  | 'turn.completed'
  | 'item.started'
  | 'item.completed'
  | 'content.delta'
  | 'agent.status'
  | 'task.assigned'
  | 'task.completed'
  | 'tool.called'
  | 'tool.result'
  | 'approval.required'
  | 'approval.granted'
  | 'approval.denied'

export interface RuntimeEvent {
  eventId: string
  agentId: AgentId
  taskId: string
  type: EventType
  payload?: Record<string, unknown>
  createdAt: string
}

export interface AgentTask {
  id: string
  userId: string
  goal: string
  agent: AgentId
  status: AgentStatus
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  parentTaskId?: string // set when NEXUS spawns sub-tasks
  createdAt: string
  updatedAt: string
}

export interface ModelConfig {
  modelPath: string       // local path on RunPod
  contextLength: number
  temperature: number
  maxTokens: number
}

export interface ToolResult {
  ok: boolean
  data?: unknown
  error?: string
}

export interface ApprovalRequest {
  taskId: string
  agentId: AgentId
  tool: string
  summary: string       // what the agent wants to do
  input: unknown        // what it will pass to the tool
}

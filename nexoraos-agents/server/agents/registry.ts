import type { AgentId } from '../../shared/types.js'

export type SpecialistAgentId = Exclude<AgentId, 'nexus'>

export const AGENT_REGISTRY = {
  nexus: { role: 'orchestrator', description: 'Plans work, delegates to specialists, and compiles results.' },
  scout: { role: 'researcher', description: 'Researches markets, competitors, and opportunities.' },
  flux: { role: 'creative', description: 'Creates copy, content, and brand or marketing materials.' },
  apex: { role: 'strategist', description: 'Builds business strategies, funnels, and growth plans.' },
  forge: { role: 'builder', description: 'Produces implementation plans and code artifacts for software tasks.' },
} as const satisfies Record<AgentId, { role: string; description: string }>

const SPECIALIST_IDS = ['scout', 'flux', 'apex', 'forge'] as const satisfies readonly SpecialistAgentId[]

/** Keep model-proposed routing inside the known specialist registry. */
export function normalizeSpecialistAgents(value: unknown): SpecialistAgentId[] {
  if (!Array.isArray(value)) return []
  const selected = value.filter((id): id is SpecialistAgentId =>
    typeof id === 'string' && (SPECIALIST_IDS as readonly string[]).includes(id),
  )
  return [...new Set(selected)]
}

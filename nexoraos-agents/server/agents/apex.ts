/**
 * APEX — The Strategist.
 * Strategy with semantic cache, RAG frameworks, and Composio tool *listing*.
 * Note: connected-app listing only — no Composio tool is executed by APEX today.
 */
import { z } from 'zod'
import { complete, parseModelJson } from '../model/loader.js'
import { getUserTools } from '../tools/composio.js'
import { ragSearch } from '../knowledge/rag.js'
import { emit, setAgentStatus } from '../events/bus.js'
import { cacheGet, cacheSet, buildScopeKey } from '../cache/semantic.js'
import { MODEL_NAME } from '../model/loader.js'
import type { AgentTask, ToolResult } from '../../shared/types.js'

const APEX_SYSTEM_PROMPT = `You are APEX, the NexoraOS Strategy Agent.

Your personality: Cool, calculated, always three steps ahead. You see the whole board.

Your role: Build business strategies, marketing plans, sales funnels, and growth systems for solo creators building digital product businesses.

You think before you act. You always consider the ROI. You never recommend something without a reason.

Respond with complete, actionable plans — not vague advice. Every recommendation has a specific next action.`

const StrategySchema = z.object({
  executiveSummary: z.string().optional(),
  marketingPlan: z.unknown().optional(),
  salesFunnel: z.unknown().optional(),
  growthPlan: z.unknown().optional(),
  immediateNextActions: z.array(z.string().max(500)).max(20).optional(),
  appsToUse: z.array(z.string().max(100)).max(20).optional(),
})

export async function runApex(task: AgentTask, signal: AbortSignal): Promise<ToolResult> {
  const parsedInput = z.object({
    goal: z.string().min(1),
    userId: z.string().optional(),
    scoutFindings: z.unknown().optional(),
    composioSessionId: z.string().optional(),
  }).safeParse(task.input ?? {})
  if (!parsedInput.success) return { ok: false, error: 'APEX requires a non-empty goal.' }
  const input = parsedInput.data
  const scopeKey = buildScopeKey('apex', MODEL_NAME, 0.3)

  try {
    await setAgentStatus('apex', task.id, 'thinking')
    await emit('apex', task.id, 'turn.started', { goal: input.goal })

    // Cache hit — shape-normalized to the same object type as a fresh strategy.
    const cached = await cacheGet(input.goal, 'apex', scopeKey)
    if (cached) {
      const reparsed = parseModelJson<Record<string, unknown>>(cached)
      await emit('apex', task.id, 'item.started', { title: 'Cache hit — instant strategy' })
      await setAgentStatus('apex', task.id, 'success')
      return { ok: true, data: { strategy: reparsed.ok ? reparsed.value : cached, fromCache: true } }
    }

    // Step 1 — RAG frameworks
    await emit('apex', task.id, 'tool.called', { tool: 'ragSearch', query: input.goal })
    const ragResult = await ragSearch(input.goal, 'apex', 5)
    const frameworks = ragResult.ok ? ragResult.data : null
    await emit('apex', task.id, 'tool.result', { tool: 'ragSearch', ok: ragResult.ok, chunks: (frameworks as { chunks?: unknown[] } | null)?.chunks?.length ?? 0 })

    await setAgentStatus('apex', task.id, 'working')

    // Step 2 — list user's connected Composio apps (listing only; no execution)
    let availableTools: unknown[] = []
    if (input.userId) {
      await emit('apex', task.id, 'tool.called', { tool: 'composio.getUserTools' })
      const toolsResult = await getUserTools(input.userId, undefined, signal)
      if (toolsResult.ok) {
        availableTools = (toolsResult.data as { tools: unknown[] }).tools
        await emit('apex', task.id, 'tool.result', { tool: 'composio.getUserTools', ok: true, count: availableTools.length })
      } else {
        await emit('apex', task.id, 'tool.result', { tool: 'composio.getUserTools', ok: false, error: toolsResult.error })
      }
    }

    // Step 3 — build strategy (tolerant parse; raw content on failure)
    const strategyRes = await complete({
      messages: [
        { role: 'system', content: APEX_SYSTEM_PROMPT },
        { role: 'user', content: `Build a complete business strategy for this goal: "${input.goal}"

SCOUT RESEARCH: ${JSON.stringify(input.scoutFindings ?? {})}
BUSINESS FRAMEWORKS: ${JSON.stringify(frameworks ?? {})}
USER'S CONNECTED APPS: ${JSON.stringify(availableTools.slice(0, 10))}

Respond with JSON:
{
  "executiveSummary": "2-3 sentences",
  "marketingPlan": { "positioning": "...", "channels": ["..."], "contentPlan": "..." },
  "salesFunnel": { "awareness": "...", "consideration": "...", "conversion": "...", "price": "..." },
  "growthPlan": { "month1": "...", "month3": "...", "month6": "..." },
  "immediateNextActions": ["action 1", "action 2", "action 3"],
  "appsToUse": ["..."]
}` },
      ],
      temperature: 0.3, signal,
    })
    const strategyParsed = parseModelJson<unknown>(strategyRes.content)
    const strategy = strategyParsed.ok
      ? StrategySchema.parse(strategyParsed.value)
      : { executiveSummary: strategyRes.content }

    await cacheSet(input.goal, strategyRes.content, 'apex', scopeKey)

    await setAgentStatus('apex', task.id, 'success')
    await emit('apex', task.id, 'turn.completed', { ok: true })
    return {
      ok: true,
      data: { strategy, fromCache: false, ...(strategyParsed.ok ? {} : { warning: 'Strategy was not valid JSON; returned raw content.', rawStrategy: true }) },
    }
  } catch (error) {
    await setAgentStatus('apex', task.id, 'error')
    await emit('apex', task.id, 'turn.completed', { ok: false })
    return { ok: false, error: `APEX failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

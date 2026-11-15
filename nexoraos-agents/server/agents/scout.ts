/**
 * SCOUT — The Researcher.
 * Uses the model + research/competitor tools + Context7 docs.
 * Search availability is surfaced in every output; unverified findings are flagged.
 */
import { z } from 'zod'
import { complete, parseModelJson } from '../model/loader.js'
import { research, competitorAnalysis } from '../tools/research.js'
import { lookupDocs } from '../tools/context7.js'
import { runSwarmSimulation } from '../tools/simulation.js'
import { emit, setAgentStatus } from '../events/bus.js'
import type { AgentTask, ToolResult } from '../../shared/types.js'

const SCOUT_SYSTEM_PROMPT = `You are SCOUT, the NexoraOS Research Agent.

Your personality: Alert, curious, always scanning. You go out, find intelligence, and report back with precision.

Your role: Research markets, validate ideas, analyze competitors, find opportunities for solo creators building digital product businesses.

Your tools:
- research(query, context) — search the web and summarize findings
- competitorAnalysis(niche) — analyze competitors and market gaps
- runSwarmSimulation(topic, seedData, userId) — simulate stakeholder reactions after research is complete

Always be specific. Never make up statistics. If live search is unavailable, say so explicitly and mark knowledge-based claims as unverified.

Return your findings as structured JSON so NEXUS can compile them with other agents' work.`

const PlanSchema = z.object({ queries: z.array(z.string().max(300)).min(1).max(20), focus: z.string().max(1000) })
const ReportSchema = z.object({
  summary: z.string().optional(),
  keyFindings: z.array(z.string().max(1000)).max(30).optional(),
  opportunity: z.string().optional(),
  recommendation: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
})

export async function runScout(task: AgentTask, signal: AbortSignal): Promise<ToolResult> {
  const parsedInput = z.object({
    goal: z.string().min(1),
    niche: z.string().optional(),
    context: z.string().optional(),
  }).safeParse(task.input ?? {})
  if (!parsedInput.success) return { ok: false, error: 'SCOUT requires a non-empty goal.' }
  const input = parsedInput.data

  try {
    await setAgentStatus('scout', task.id, 'thinking')
    await emit('scout', task.id, 'turn.started', { goal: input.goal })

    // Step 1 — research plan (tolerant parsing; default to the goal itself)
    const planRes = await complete({
      messages: [
        { role: 'system', content: SCOUT_SYSTEM_PROMPT },
        { role: 'user', content: `Plan your research for this goal: "${input.goal}"

What specific queries will you run? What do you need to find out?
Respond with JSON: { "queries": ["query1", "query2"], "focus": "what matters most" }` },
      ],
      temperature: 0.3, signal,
    })
    const planParsed = parseModelJson<unknown>(planRes.content)
    const planData = PlanSchema.safeParse(planParsed.ok ? planParsed.value : { queries: [input.goal], focus: input.goal })
    const queries = planData.success ? planData.data.queries.slice(0, 3) : [input.goal]
    await emit('scout', task.id, 'item.started', { title: 'Research plan ready', summary: planData.success ? planData.data.focus : input.goal })

    // Step 2 — run research tools; track whether live search was available
    await setAgentStatus('scout', task.id, 'working')
    const researchResults: unknown[] = []
    let searchAvailable: boolean | undefined

    for (const query of queries) {
      await emit('scout', task.id, 'tool.called', { tool: 'research', query })
      const result = await research(query, input.context ?? input.goal, signal)
      if (result.ok) {
        const data = result.data as { searchAvailable?: boolean; warning?: string }
        if (typeof data.searchAvailable === 'boolean') searchAvailable = searchAvailable === undefined ? data.searchAvailable : searchAvailable && data.searchAvailable
        researchResults.push(result.data)
        await emit('scout', task.id, 'tool.result', { tool: 'research', ok: true, liveSearch: data.searchAvailable })
      } else {
        await emit('scout', task.id, 'tool.result', { tool: 'research', ok: false, error: result.error })
      }
    }

    // Step 3 — Context7 docs lookup for library/framework goals
    const libraryMatch = input.goal.match(/\b(react|next\.?js|supabase|tailwind|typescript|vite|prisma|drizzle|hono|fastify|express|langchain|openai|stripe|whop)\b/i)
    if (libraryMatch) {
      const libName = libraryMatch[1].toLowerCase()
      await emit('scout', task.id, 'tool.called', { tool: 'context7', library: libName })
      const docsResult = await lookupDocs(libName, input.goal)
      if (docsResult.ok) {
        researchResults.push({ source: 'context7', library: libName, docs: (docsResult.data as { docs: string }).docs })
        await emit('scout', task.id, 'tool.result', { tool: 'context7', ok: true })
      } else {
        await emit('scout', task.id, 'tool.result', { tool: 'context7', ok: false, error: docsResult.error })
      }
    }

    // Step 4 — competitor analysis when a niche is known
    let competitorData: unknown = null
    if (input.niche) {
      await emit('scout', task.id, 'tool.called', { tool: 'competitorAnalysis', niche: input.niche })
      const compResult = await competitorAnalysis(input.niche, signal)
      if (compResult.ok) {
        competitorData = compResult.data
        const data = compResult.data as { searchAvailable?: boolean }
        if (typeof data.searchAvailable === 'boolean') searchAvailable = searchAvailable === undefined ? data.searchAvailable : searchAvailable && data.searchAvailable
        await emit('scout', task.id, 'tool.result', { tool: 'competitorAnalysis', ok: true, liveSearch: data.searchAvailable })
      } else {
        await emit('scout', task.id, 'tool.result', { tool: 'competitorAnalysis', ok: false, error: compResult.error })
      }
    }

    // Step 5 — simulate likely stakeholder reactions from completed research.
    // MiroFish is optional at runtime; an unavailable backend is surfaced but
    // does not discard SCOUT's completed research findings.
    let simulationData: unknown = null
    let simulationWarning: string | undefined
    await emit('scout', task.id, 'tool.called', { tool: 'runSwarmSimulation', topic: input.goal })
    try {
      const simulation = await runSwarmSimulation(
        input.goal,
        JSON.stringify({ research: researchResults, competitors: competitorData }),
        task.userId,
      )
      simulationData = simulation
      await emit('scout', task.id, 'tool.result', { tool: 'runSwarmSimulation', ok: true, confidenceScore: simulation.confidenceScore })
    } catch (error) {
      simulationWarning = error instanceof Error ? error.message : String(error)
      await emit('scout', task.id, 'tool.result', { tool: 'runSwarmSimulation', ok: false, error: simulationWarning })
    }

    // Step 6 — final report (tolerant parse; attach raw content on failure)
    const reportRes = await complete({
      messages: [
        { role: 'system', content: SCOUT_SYSTEM_PROMPT },
        { role: 'user', content: `Compile your research findings into a final report.

GOAL: ${input.goal}
RESEARCH: ${JSON.stringify(researchResults)}
COMPETITORS: ${JSON.stringify(competitorData)}
MIROFISH SWARM SIMULATION: ${JSON.stringify(simulationData)}
${simulationWarning ? `SIMULATION WARNING: ${simulationWarning}` : ''}

Respond with JSON:
{
  "summary": "2-3 sentence executive summary",
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "opportunity": "the main opportunity identified",
  "recommendation": "what NEXUS should tell the user to do",
  "confidence": "high | medium | low"
}` },
      ],
      temperature: 0.3, signal,
    })
    const reportParsed = parseModelJson<unknown>(reportRes.content)
    const reportData = reportParsed.ok ? ReportSchema.parse(reportParsed.value) : { summary: reportRes.content }

    await setAgentStatus('scout', task.id, 'success')
    await emit('scout', task.id, 'turn.completed', { ok: true })
    return {
      ok: true,
      data: {
        research: researchResults,
        competitors: competitorData,
        simulation: simulationData,
        ...reportData,
        ...(simulationWarning ? { simulationWarning } : {}),
        searchAvailable: searchAvailable ?? false,
        verified: (searchAvailable ?? false) === true,
        ...(reportParsed.ok ? {} : { warning: 'Report was not valid JSON; returned raw content.', rawReport: true }),
      },
    }
  } catch (error) {
    await setAgentStatus('scout', task.id, 'error')
    await emit('scout', task.id, 'turn.completed', { ok: false })
    return { ok: false, error: `SCOUT failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/**
 * NEXUS — The Orchestrator.
 * Flow: validate → brand-profile discovery (2–3 questions, adaptive) → plan →
 * SCOUT → FLUX+APEX in parallel → FORGE → compile → persist output → reply.
 * Discovery state lives in brand_profiles so personalization survives restarts.
 */
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { complete, parseModelJson } from '../model/loader.js'
import { emit, setAgentStatus } from '../events/bus.js'
import { createSession, getSession, appendMessage, getMessages } from '../session/manager.js'
import { replyToChannel } from '../channels/delivery.js'
import { getSupabaseClient } from '../db/client.js'
import { normalizeSpecialistAgents, type SpecialistAgentId } from './registry.js'
import { runScout } from './scout.js'
import { runFlux } from './flux.js'
import { runApex } from './apex.js'
import { runForge } from './forge.js'
import {
  getBrandProfile, saveBrandProfile, isProfileReady,
  extractProfileFromAnswers, summarizeProfile, DISCOVERY_QUESTIONS,
} from '../discovery.js'
import type { AgentTask, ToolResult } from '../../shared/types.js'

const NEXUS_SYSTEM_PROMPT = `You are NEXUS, the NexoraOS Orchestrator.

Your personality: Calm, commanding, sees everything. You plan and coordinate.

Your role: Receive a user's goal, understand their actual situation from their saved brand profile, decide which specialist agents to activate (SCOUT for research, FLUX for creative, APEX for strategy, FORGE for software building), delegate tasks to each, then compile their outputs into one cohesive result for the user.

You never do the work yourself. You plan, delegate, and compile. You never present unverified research as verified facts — if a finding lacks live sources, say so.

Always think: what does this user need to succeed given where they are TODAY? Then activate exactly the right agents to deliver it.`

interface NexusInput {
  goal: string
  userId: string
  channel?: 'web' | 'whatsapp' | 'telegram'
  channelMeta?: Record<string, unknown>
  answers?: Record<string, string>
  dailyRun?: boolean
  skipDiscovery?: boolean
}

const NexusInputSchema = z.object({
  goal: z.string().min(1),
  userId: z.string().min(1),
  channel: z.enum(['web', 'whatsapp', 'telegram']).optional(),
  channelMeta: z.record(z.unknown()).optional(),
  answers: z.record(z.string()).optional(),
  dailyRun: z.boolean().optional(),
  skipDiscovery: z.boolean().optional(),
})

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

const BRAND_GOAL_PATTERN = /\b(brand|branding|business|audience|grow|launch|market|promote|content|followers|personal)\b/i

/** Create a specialist sub-task row. Status starts at 'working' (it is executed inline by NEXUS), not 'queued'. */
async function spawnAgentTask(parentTask: AgentTask, agent: SpecialistAgentId, input: Record<string, unknown>): Promise<AgentTask> {
  const now = new Date().toISOString()
  const subTask: AgentTask = {
    id: randomUUID(),
    userId: parentTask.userId,
    goal: parentTask.goal,
    agent,
    status: 'working',
    input,
    parentTaskId: parentTask.id,
    createdAt: now,
    updatedAt: now,
  }
  const { error } = await getSupabaseClient().from('agent_tasks').insert({
    id: subTask.id, user_id: subTask.userId, goal: subTask.goal, agent: subTask.agent,
    status: subTask.status, input: subTask.input, parent_task_id: subTask.parentTaskId,
    created_at: subTask.createdAt, updated_at: subTask.updatedAt,
  })
  if (error) throw new Error(`Failed to create ${agent} subtask: ${error.message}`)
  return subTask
}

/** Best-effort: mark a subtask errored when its specialist returned ok:false (validation failures never reach the agent's own catch). */
async function markSubtaskError(taskId: string, agent: SpecialistAgentId) {
  try { await setAgentStatus(agent, taskId, 'error') } catch { /* status is best-effort here */ }
}

async function persistTaskOutput(taskId: string, output: Record<string, unknown>) {
  try {
    await getSupabaseClient().from('agent_tasks')
      .update({ output, updated_at: new Date().toISOString() })
      .eq('id', taskId)
  } catch (e) { console.error('Failed to persist task output:', e instanceof Error ? e.message : String(e)) }
}

interface Roadmap { steps: Array<{ title: string; detail?: string; done?: boolean }> }

async function loadRoadmap(userId: string): Promise<Roadmap | null> {
  try {
    const { data } = await getSupabaseClient().from('brand_profiles')
      .select('roadmap').eq('user_id', userId).single()
    return (data?.roadmap as Roadmap | null) ?? null
  } catch { return null }
}

async function saveRoadmap(userId: string, roadmap: Roadmap) {
  await getSupabaseClient().from('brand_profiles')
    .update({ roadmap, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
}

async function buildRoadmap(task: AgentTask, input: NexusInput, brandSummary: string, signal: AbortSignal): Promise<Roadmap> {
  const apexTask: AgentTask = {
    id: randomUUID(), userId: input.userId, goal: input.goal, agent: 'apex',
    status: 'working', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    input: { goal: `Build a step-by-step personal brand roadmap for this user, starting from their ACTUAL situation.`, userId: input.userId },
  }
  const result = await runApex({ ...apexTask, parentTaskId: task.id }, signal)
  // Fallback outline if APEX fails: never block the flow on the strategy agent.
  const fallback: Roadmap = { steps: [
    { title: 'Set up core profiles on the chosen platforms' },
    { title: 'Publish first 3 pieces of cornerstone content' },
    { title: 'Engage daily with the target community' },
  ]}
  if (!result.ok) return fallback
  const strategy = (result.data as { strategy?: Record<string, unknown> }).strategy ?? {}
  const immediate = Array.isArray(strategy['immediateNextActions']) ? strategy['immediateNextActions'] as string[] : []
  const growth = (strategy['growthPlan'] ?? {}) as Record<string, unknown>
  const steps: Roadmap['steps'] = [
    ...immediate.map(a => ({ title: a })),
    ...Object.values(growth).map(v => ({ title: String(v) })),
  ]
  return { steps: steps.length ? steps : fallback.steps }
}

async function runDailyExecution(task: AgentTask, input: NexusInput, signal: AbortSignal): Promise<ToolResult> {
  await setAgentStatus('nexus', task.id, 'working')
  await emit('nexus', task.id, 'turn.started', { dailyRun: true })

  const profile = await getBrandProfile(input.userId).catch(() => null)
  const roadmap = await loadRoadmap(input.userId)
  if (!profile || !roadmap?.steps?.length) {
    return { ok: false, error: 'NEXUS daily run requires a ready brand profile with a roadmap. Complete discovery first.' }
  }

  const pending = roadmap.steps.filter(s => !s.done)
  if (!pending.length) return { ok: true, data: { dailyRun: true, message: 'Roadmap complete — nothing pending today.', done: true } }

  // Pick today's priorities via the model; fall back to the first two pending steps.
  let chosen = pending.slice(0, 2)
  try {
    const pick = await complete({
      messages: [
        { role: 'system', content: 'You prioritize tasks. Respond with JSON only.' },
        { role: 'user', content: `Roadmap pending steps: ${JSON.stringify(pending)}\nUser goal: ${profile.goals?.objective ?? input.goal}\nPick the top 1-2 steps to execute today as JSON: {"today":["step title",...]}.` },
      ],
      temperature: 0.3, signal,
    })
    const parsed = parseModelJson<{ today?: string[] }>(pick.content)
    if (parsed.ok && Array.isArray(parsed.value.today) && parsed.value.today.length) {
      const titles = new Set(parsed.value.today.map(String))
      const matched = pending.filter(s => titles.has(s.title))
      if (matched.length) chosen = matched.slice(0, 2)
    }
  } catch { /* fallback list already set */ }

  const results: Record<string, unknown> = {}
  const needsResearch = chosen.some(s => /research|audience|competitor|trend/i.test(s.title))
  const fluxInput: {
    goal: string;
    productName: string | undefined;
    targetAudience: string | undefined;
    scoutFindings: unknown;
  } = {
    goal: chosen.map(s => s.title).join('; '),
    productName: profile.assets?.brand ?? undefined,
    targetAudience: profile.goals?.targetAudience ?? undefined,
    scoutFindings: undefined,
  }

  if (needsResearch) {
    const scoutTask = await spawnAgentTask(task, 'scout', {
      goal: `Research for today's brand tasks: ${chosen.map(s => s.title).join('; ')}`,
      niche: profile.niche ?? undefined, context: summarizeProfile(profile),
    })
    const scoutResult = await runScout(scoutTask, signal)
    if (!scoutResult.ok) await markSubtaskError(scoutTask.id, 'scout')
    results.scout = scoutResult.ok ? scoutResult.data : { error: scoutResult.error }
    if (scoutResult.ok) fluxInput.scoutFindings = scoutResult.data as unknown
  }

  const fluxTask = await spawnAgentTask(task, 'flux', fluxInput)
  const fluxResult = await runFlux(fluxTask, signal)
  if (!fluxResult.ok) await markSubtaskError(fluxTask.id, 'flux')
  results.flux = fluxResult.ok ? fluxResult.data : { error: fluxResult.error }

  // Record progress so the next run knows what happened.
  const entry = {
    date: new Date().toISOString().slice(0, 10),
    tasks: chosen.map(s => s.title),
    ok: fluxResult.ok,
    outputs: fluxResult.ok ? Object.keys((fluxResult.data as { creations?: Record<string, string> }).creations ?? {}) : [fluxResult.error ?? 'error'],
  }
  try {
    const { data } = await getSupabaseClient().from('brand_profiles').select('progress').eq('user_id', input.userId).single()
    const progress = [...((data?.progress as unknown[]) ?? []), entry]
    await getSupabaseClient().from('brand_profiles').update({ progress, last_daily_run: entry.date, updated_at: new Date().toISOString() }).eq('user_id', input.userId)
  } catch (e) { console.error('Failed to persist daily progress:', e instanceof Error ? e.message : String(e)) }

  await setAgentStatus('nexus', task.id, 'success')
  await emit('nexus', task.id, 'turn.completed', { ok: true, dailyRun: true })
  await persistTaskOutput(task.id, { dailyRun: true, chosen, results })
  return { ok: true, data: { dailyRun: true, chosen, results } }
}

export async function runNexus(task: AgentTask, signal: AbortSignal): Promise<ToolResult> {
  const parsedInput = NexusInputSchema.safeParse(task.input ?? {})
  if (!parsedInput.success) return { ok: false, error: 'NEXUS requires a goal and user ID.' }
  const input = parsedInput.data

  try {
    if (input.dailyRun) return await runDailyExecution(task, input, signal)

    await setAgentStatus('nexus', task.id, 'thinking')
    await emit('nexus', task.id, 'turn.started', { goal: input.goal })

    // Step 1 — session memory
    let session = await getSession(input.userId, 'nexus')
    if (!session) session = await createSession(input.userId, 'nexus', NEXUS_SYSTEM_PROMPT)
    await appendMessage(session.id, { role: 'user', content: input.goal })

    // Step 2 — brand-profile discovery (personalization gate)
    let profile = await getBrandProfile(input.userId).catch(() => null)
    if (!input.skipDiscovery && BRAND_GOAL_PATTERN.test(input.goal) && !isProfileReady(profile)) {
      if (input.answers && Object.keys(input.answers).length) {
        const merged = await extractProfileFromAnswers(input.answers, profile ?? { userId: input.userId, status: 'discovering', updatedAt: new Date().toISOString() })
        await saveBrandProfile(input.userId, merged, 'ready')
        const roadmap = await buildRoadmap(task, input, summarizeProfile(merged as Parameters<typeof summarizeProfile>[0]), signal)
        await saveRoadmap(input.userId, roadmap)
        profile = await getBrandProfile(input.userId)
        await emit('nexus', task.id, 'item.started', { title: 'Brand profile ready', summary: 'Roadmap created from your answers.' })
      } else {
        await saveBrandProfile(input.userId, {
          ...(profile ?? { userId: input.userId }),
          updatedAt: new Date().toISOString(),
        }, 'discovering')
        const response = `Before I build your plan, I need to understand where you're starting from. Please answer these 3 questions:\n\n1. ${DISCOVERY_QUESTIONS[0]}\n2. ${DISCOVERY_QUESTIONS[1]}\n3. ${DISCOVERY_QUESTIONS[2]}\n\nSend your answers and I'll build a personalized roadmap.`
        await setAgentStatus('nexus', task.id, 'success')
        await emit('nexus', task.id, 'turn.completed', { ok: true, awaitingInput: true })
        await persistTaskOutput(task.id, { awaitingInput: true, questions: DISCOVERY_QUESTIONS })
        if ((input.channel ?? 'web') !== 'web') await replyToChannel(input.channel as 'whatsapp' | 'telegram', input.channelMeta ?? {}, response)
        return { ok: true, data: { awaitingInput: true, questions: DISCOVERY_QUESTIONS, response, sessionId: session.id } }
      }
    }
    const brandContext = profile && isProfileReady(profile) ? summarizeProfile(profile) : 'No brand profile on file.'

    // Step 3 — plan which agents to activate
    const history = await getMessages(session.id)
    const plan = await complete({
      messages: [
        ...history,
        { role: 'system', content: NEXUS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `The user's goal is: "${input.goal}"

USER SITUATION (from saved brand profile — reuse these assets where relevant, do not ignore them):
${brandContext}

Decide which agents to activate. Choose any combination of:
- scout: market research, competitor analysis, idea validation
- flux: content creation, copy, landing pages, brand assets
- apex: business strategy, marketing plans, sales funnels
- forge: software, website, product, and application implementation plans and code artifacts

For software/build tasks, prefer FORGE. Activate other agents when useful. Respond with JSON:
{
  "plan": "what you will do in 1 sentence",
  "agents": ["scout", "flux", "apex", "forge"],
  "scoutFocus": "what SCOUT should research (or null)",
  "fluxFocus": "what FLUX should create (or null)",
  "apexFocus": "what APEX should strategize (or null)",
  "forgeFocus": "what FORGE should build (or null)",
  "niche": "the market niche if identifiable (or null)"
}`,
        },
      ],
      temperature: 0.3,
      signal,
    })

    const planParsed = parseModelJson<{
      plan?: string; agents?: unknown; scoutFocus?: unknown; fluxFocus?: unknown;
      apexFocus?: unknown; forgeFocus?: unknown; niche?: unknown
    }>(plan.content)
    const raw = planParsed.ok ? planParsed.value : {}
    const planData = {
      plan: optionalString(raw.plan) ?? 'Delegate the goal to the relevant specialists.',
      agents: normalizeSpecialistAgents(raw.agents),
      scoutFocus: optionalString(raw.scoutFocus),
      fluxFocus: optionalString(raw.fluxFocus),
      apexFocus: optionalString(raw.apexFocus),
      forgeFocus: optionalString(raw.forgeFocus),
      niche: optionalString(raw.niche),
    }
    if (!planParsed.ok) {
      await emit('nexus', task.id, 'item.started', { title: 'Plan unparseable — using defaults', summary: plan.content.slice(0, 200) })
      if (planData.agents.length === 0) planData.agents = ['flux']
    }

    await emit('nexus', task.id, 'item.started', { title: 'Plan ready', summary: planData.plan })
    await setAgentStatus('nexus', task.id, 'working')

    // Step 4 — SCOUT first; FLUX + APEX in parallel; FORGE last
    const agentResults: Record<string, unknown> = {}
    if (planData.agents.includes('scout') && planData.scoutFocus) {
      const scoutTask = await spawnAgentTask(task, 'scout', {
        goal: planData.scoutFocus, niche: planData.niche, context: input.goal,
      })
      const scoutResult = await runScout(scoutTask, signal)
      if (!scoutResult.ok) await markSubtaskError(scoutTask.id, 'scout')
      agentResults.scout = scoutResult.ok ? scoutResult.data : { error: scoutResult.error }
    }

    const parallelJobs: Promise<void>[] = []
    if (planData.agents.includes('flux') && planData.fluxFocus) {
      parallelJobs.push((async () => {
        const fluxTask = await spawnAgentTask(task, 'flux', {
          goal: planData.fluxFocus, scoutFindings: agentResults.scout,
          productName: profile?.assets?.brand ?? undefined,
          targetAudience: profile?.goals?.targetAudience ?? undefined,
        })
        const result = await runFlux(fluxTask, signal)
        if (!result.ok) await markSubtaskError(fluxTask.id, 'flux')
        agentResults.flux = result.ok ? result.data : { error: result.error }
      })())
    }
    if (planData.agents.includes('apex') && planData.apexFocus) {
      parallelJobs.push((async () => {
        const apexTask = await spawnAgentTask(task, 'apex', {
          goal: planData.apexFocus, scoutFindings: agentResults.scout, userId: input.userId,
        })
        const result = await runApex(apexTask, signal)
        if (!result.ok) await markSubtaskError(apexTask.id, 'apex')
        agentResults.apex = result.ok ? result.data : { error: result.error }
      })())
    }
    await Promise.all(parallelJobs)

    if (planData.agents.includes('forge') && planData.forgeFocus) {
      const forgeTask = await spawnAgentTask(task, 'forge', {
        goal: planData.forgeFocus, context: input.goal,
        scoutFindings: agentResults.scout, apexStrategy: agentResults.apex,
      })
      const result = await runForge(forgeTask, signal)
      if (!result.ok) await markSubtaskError(forgeTask.id, 'forge')
      agentResults.forge = result.ok ? result.data : { error: result.error }
    }

    // Step 5 — compile final output
    const compilation = await complete({
      messages: [
        { role: 'system', content: NEXUS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Compile the results from your agents into one clear, actionable response for the user.

USER GOAL: ${input.goal}
USER SITUATION: ${brandContext}
SCOUT FINDINGS: ${JSON.stringify(agentResults.scout ?? 'not activated')}
FLUX CREATIONS: ${JSON.stringify(agentResults.flux ?? 'not activated')}
APEX STRATEGY: ${JSON.stringify(agentResults.apex ?? 'not activated')}
FORGE BUILD ARTIFACTS: ${JSON.stringify(agentResults.forge ?? 'not activated')}

Write a clear, structured response that summarizes what was found, created, planned, or built; gives the user their immediate next 3 actions; and explains what is ready to use right now. If SCOUT's output has searchAvailable=false or a warning, say its findings are unverified. Distinguish proposed code from code that has actually been run or tested. Be direct and specific.`,
        },
      ],
      temperature: 0.5,
      signal,
    })

    await appendMessage(session.id, { role: 'assistant', content: compilation.content })
    const channel = input.channel ?? 'web'
    if (channel !== 'web') await replyToChannel(channel, input.channelMeta ?? {}, compilation.content)

    await setAgentStatus('nexus', task.id, 'success')
    await emit('nexus', task.id, 'turn.completed', { ok: true })
    const output = { response: compilation.content, agentResults, sessionId: session.id }
    await persistTaskOutput(task.id, output)
    return { ok: true, data: output }
  } catch (error) {
    try { await setAgentStatus('nexus', task.id, 'error') } catch { /* status best-effort */ }
    await emit('nexus', task.id, 'turn.completed', { ok: false })
    return { ok: false, error: `NEXUS failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

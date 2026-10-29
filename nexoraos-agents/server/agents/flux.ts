/**
 * FLUX — The Creative.
 * Model-driven content creation; deliverables are written to FLUX_WORKSPACE.
 * Per-file write failures are reported but do not abort remaining deliverables.
 */
import { z } from 'zod'
import { complete, parseModelJson } from '../model/loader.js'
import { writeFile } from '../tools/computer.js'
import { emit, setAgentStatus } from '../events/bus.js'
import type { AgentTask, ToolResult } from '../../shared/types.js'

const FLUX_SYSTEM_PROMPT = `You are FLUX, the NexoraOS Creative Agent.

Your personality: Expressive, bold, energetic. You turn ideas into stunning content — copy, designs, landing pages, product descriptions, marketing materials.

Your role: Create all written content for solo creators building digital product businesses. You make things look and sound amazing.

Your tools:
- writeFile(filename, content) — save your creations to the workspace

You produce complete, ready-to-use content. Never write placeholders. Never say "add image here." Always deliver the finished thing.`

const PlanSchema = z.object({ deliverables: z.array(z.string().max(500)).min(1).max(20), approach: z.string().max(2000).optional() })

export async function runFlux(task: AgentTask, signal: AbortSignal): Promise<ToolResult> {
  const parsedInput = z.object({
    goal: z.string().min(1),
    productName: z.string().optional(),
    targetAudience: z.string().optional(),
    scoutFindings: z.unknown().optional(),
    apexStrategy: z.unknown().optional(),
  }).safeParse(task.input ?? {})
  if (!parsedInput.success) return { ok: false, error: 'FLUX requires a non-empty goal.' }
  const input = parsedInput.data

  try {
    await setAgentStatus('flux', task.id, 'thinking')
    await emit('flux', task.id, 'turn.started', { goal: input.goal })

    // Step 1 — creative plan (tolerant parse)
    const planRes = await complete({
      messages: [
        { role: 'system', content: FLUX_SYSTEM_PROMPT },
        { role: 'user', content: `Plan the creative work for this goal: "${input.goal}"

SCOUT RESEARCH: ${JSON.stringify(input.scoutFindings ?? {})}
APEX STRATEGY: ${JSON.stringify(input.apexStrategy ?? {})}

What will you create? List the deliverables.
Respond with JSON: { "deliverables": ["landing page copy", "product description", "email sequence"], "approach": "creative direction" }` },
      ],
      temperature: 0.5, signal,
    })
    const planParsed = parseModelJson<unknown>(planRes.content)
    const planData = PlanSchema.safeParse(planParsed.ok ? planParsed.value : { deliverables: [input.goal], approach: input.goal })
    const deliverables = (planData.success ? planData.data.deliverables : [input.goal]).slice(0, 4)
    await emit('flux', task.id, 'item.started', { title: 'Creative plan ready', summary: planData.success ? planData.data.approach : input.goal })

    await setAgentStatus('flux', task.id, 'working')

    // Step 2 — create each deliverable; write failures are recorded, not fatal
    const creations: Record<string, string> = {}
    const failedWrites: string[] = []

    for (const deliverable of deliverables) {
      await emit('flux', task.id, 'item.started', { title: `Creating: ${deliverable}` })
      const creation = await complete({
        messages: [
          { role: 'system', content: FLUX_SYSTEM_PROMPT },
          { role: 'user', content: `Create this for the business: ${deliverable}

GOAL: ${input.goal}
PRODUCT: ${input.productName ?? 'digital product'}
AUDIENCE: ${input.targetAudience ?? 'solo creators and entrepreneurs'}
RESEARCH: ${JSON.stringify(input.scoutFindings ?? {})}
STRATEGY: ${JSON.stringify(input.apexStrategy ?? {})}

Write the complete, ready-to-use ${deliverable}. No placeholders. No "[add here]". Full content only.` },
        ],
        temperature: 0.7, signal,
      })
      creations[deliverable] = creation.content

      const filename = deliverable.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.md'
      const saved = writeFile(filename, creation.content)
      if (saved.ok) {
        await emit('flux', task.id, 'item.completed', { itemType: 'tool', ok: true, output: `Created: ${deliverable} (${filename})` })
      } else {
        failedWrites.push(`${filename}: ${saved.error ?? 'write failed'}`)
        await emit('flux', task.id, 'item.completed', { itemType: 'tool', ok: false, output: `Created but NOT saved: ${deliverable}` })
      }
    }

    // Step 3 — summary (tolerant parse)
    const summaryRes = await complete({
      messages: [
        { role: 'system', content: FLUX_SYSTEM_PROMPT },
        { role: 'user', content: `Summarize what you created:

DELIVERABLES: ${JSON.stringify(Object.keys(creations))}

Respond with JSON:
{
  "summary": "what was created",
  "headline": "the strongest headline from the copy",
  "keyMessage": "the core value proposition you wrote",
  "filesCreated": ["file1.md", "file2.md"]
}` },
      ],
      temperature: 0.3, signal,
    })
    const summaryParsed = parseModelJson<Record<string, unknown>>(summaryRes.content)

    await setAgentStatus('flux', task.id, 'success')
    await emit('flux', task.id, 'turn.completed', { ok: true })
    return {
      ok: true,
      data: {
        creations,
        filesCreated: Object.keys(creations).map(d => d.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.md'),
        ...(summaryParsed.ok ? summaryParsed.value : { summary: summaryRes.content }),
        ...(failedWrites.length ? { warning: 'Some deliverables could not be saved to the workspace.', failedWrites } : {}),
      },
    }
  } catch (error) {
    await setAgentStatus('flux', task.id, 'error')
    await emit('flux', task.id, 'turn.completed', { ok: false })
    return { ok: false, error: `FLUX failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

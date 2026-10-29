/**
 * FORGE — The Builder.
 * Produces reviewable implementation plans and source artifacts for software tasks.
 * Generated code is returned as data; this agent does not execute it.
 */
import { z } from 'zod'
import { complete, parseModelJson } from '../model/loader.js'
import { emit, setAgentStatus } from '../events/bus.js'
import type { AgentTask, ToolResult } from '../../shared/types.js'

const FORGE_SYSTEM_PROMPT = `You are FORGE, the NexoraOS Builder Agent.

Your role: turn software and product-building goals into clear implementation plans and complete, reviewable source-code artifacts. Preserve existing architecture when working from supplied context. Explain assumptions and validation steps. Do not claim to have run or tested code. Never include secrets or ask to execute shell commands.

Return one JSON object matching the requested schema. Keep file paths relative and descriptive.`

const ForgeInputSchema = z.object({
  goal: z.string().min(1),
  context: z.string().optional(),
  scoutFindings: z.unknown().optional(),
  apexStrategy: z.unknown().optional(),
})

const ForgeOutputSchema = z.object({
  summary: z.string().max(4000),
  implementationPlan: z.array(z.string().max(500)).max(50),
  files: z.array(z.object({ path: z.string().max(260), language: z.string().max(50), content: z.string().max(100_000) })).max(30),
  validationNotes: z.array(z.string().max(500)).max(30),
})

export async function runForge(task: AgentTask, signal: AbortSignal): Promise<ToolResult> {
  const parsedInput = ForgeInputSchema.safeParse(task.input ?? {})
  if (!parsedInput.success) return { ok: false, error: 'FORGE requires a non-empty goal.' }
  const input = parsedInput.data

  try {
    await setAgentStatus('forge', task.id, 'thinking')
    await emit('forge', task.id, 'turn.started', { goal: input.goal })
    await setAgentStatus('forge', task.id, 'working')

    const result = await complete({
      messages: [
        { role: 'system', content: FORGE_SYSTEM_PROMPT },
        { role: 'user', content: `Build a solution for this goal: ${input.goal}\n\n` +
          `CONTEXT: ${input.context ?? 'No source repository or additional implementation context was supplied.'}\n` +
          `RESEARCH: ${JSON.stringify(input.scoutFindings ?? {})}\n` +
          `STRATEGY: ${JSON.stringify(input.apexStrategy ?? {})}\n\n` +
          `Return JSON with this shape: {"summary":"...","implementationPlan":["..."],"files":[{"path":"src/example.ts","language":"typescript","content":"complete source"}],"validationNotes":["checks to run; do not claim they were run"]}. ` +
          `Do not use absolute paths, parent-directory segments, shell commands, or secrets.` },
      ],
      temperature: 0.2, signal,
    })

    const parsed = parseModelJson<unknown>(result.content)
    if (!parsed.ok) {
      return { ok: false, error: 'FORGE could not produce a valid JSON artifact. Raw output retained in task events.', }
    }
    const output = ForgeOutputSchema.parse(parsed.value)
    for (const file of output.files) {
      if (file.path.startsWith('/') || file.path.split(/[\\/]/).includes('..')) {
        throw new Error('Generated artifact included an unsafe path; no files were written.')
      }
    }

    await setAgentStatus('forge', task.id, 'success')
    await emit('forge', task.id, 'turn.completed', { ok: true, files: output.files.length })
    return { ok: true, data: output }
  } catch (error) {
    await setAgentStatus('forge', task.id, 'error')
    await emit('forge', task.id, 'turn.completed', { ok: false })
    return { ok: false, error: `FORGE failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

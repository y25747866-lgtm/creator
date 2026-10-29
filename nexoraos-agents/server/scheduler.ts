/**
 * NexoraOS Scheduler — recovery sweep + daily brand execution.
 * 1. On startup: re-queue orphaned 'queued' NEXUS tasks (e.g. after a restart).
 * 2. Periodically: create one daily-run task per ready brand profile.
 * The queue watcher in index.ts executes them; state lives in Supabase, so
 * work survives restarts.
 */
import { getSupabaseClient } from './db/client.js'
import { getModelStatus } from './model/loader.js'

const INTERVAL_MINUTES = Number(process.env.SCHEDULER_INTERVAL_MINUTES ?? 60)

export async function sweepQueuedTasks(): Promise<string[]> {
  const { data, error } = await getSupabaseClient().from('agent_tasks')
    .select('id')
    .eq('agent', 'nexus')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
  if (error) { console.error('Sweep failed:', error.message); return [] }
  return (data ?? []).map((row) => String(row.id)).filter(Boolean)
}

export async function createDailyTasks(): Promise<number> {
  // Model must be reachable before burning tokens on daily runs.
  const model = await getModelStatus()
  if (!model.ready) return 0

  const today = new Date().toISOString().slice(0, 10)
  const { data: profiles, error } = await getSupabaseClient().from('brand_profiles')
    .select('user_id, status, last_daily_run')
    .eq('status', 'ready')
    .or(`last_daily_run.is.null,last_daily_run.lt.${today}`)
  if (error) { console.error('Daily task query failed:', error.message); return 0 }
  if (!profiles?.length) return 0

  const supabase = getSupabaseClient()
  const { data: alreadyQueued } = await supabase.from('agent_tasks')
    .select('input')
    .eq('agent', 'nexus')
    .eq('status', 'queued')
  const queuedDailyUsers = new Set(
    (alreadyQueued ?? [])
      .map(r => (r.input as { dailyRun?: boolean; userId?: string } | null))
      .filter(i => i?.dailyRun && i.userId)
      .map(i => i!.userId as string),
  )

  let created = 0
  for (const p of profiles as Array<{ user_id: string }>) {
    if (queuedDailyUsers.has(p.user_id)) continue
    const { error: insertError } = await supabase.from('agent_tasks').insert({
      user_id: p.user_id,
      goal: 'Daily brand execution',
      agent: 'nexus',
      status: 'queued',
      input: { goal: 'Daily brand execution', userId: p.user_id, dailyRun: true, channel: 'web' },
    })
    if (!insertError) created++
  }
  return created
}

export function startScheduler(): void {
  const tick = async () => {
    try { await createDailyTasks() } catch (e) { console.error('Scheduler tick failed:', e instanceof Error ? e.message : String(e)) }
  }
  const timer = setInterval(tick, INTERVAL_MINUTES * 60_000)
  timer.unref()
  void tick()
  console.log(`Scheduler running (every ${INTERVAL_MINUTES}m): daily brand tasks`)
}

/**
 * NexoraOS Hybrid Agent Server.
 * Security: JWT auth on /run, /stream, /publish, /platforms*, /analytics, /approvals;
 * WhatsApp HMAC-SHA256 and Telegram secret-token webhook verification.
 * Startup is decoupled from model readiness: the HTTP server always listens;
 * the Supabase queue watcher activates once the model endpoint is ready.
 */
import express from 'express'
import { getSupabaseClient } from './db/client.js'
import { mapAgentTaskRow } from './db/mappers.js'
import { getModelStatus, modelReady } from './model/loader.js'
import { AGENT_REGISTRY } from './agents/registry.js'
import { runNexus } from './agents/nexus.js'
import { handleWhatsApp, handleTelegram } from './channels/delivery.js'
import { subscribe } from './events/bus.js'
import { verifyWhatsAppSignature, verifyTelegramSecret } from './security/webhooks.js'
import { sweepQueuedTasks, startScheduler } from './scheduler.js'
import { getAdapter, supportedPlatforms, verifyConnection, publishWithApproval, getAnalyticsFor, decideApproval, upsertConnection } from './platforms/index.js'
import type { PlatformId } from './platforms/types.js'

const app = express()
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => { (req as express.Request & { rawBody?: Buffer }).rawBody = buf },
}))

// ---------- Startup env validation (fail fast, no secrets printed) ----------
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'] as const
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k])
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}. See .env.example.`)
  process.exit(1)
}
if (process.env.WHATSAPP_TOKEN && !process.env.WHATSAPP_APP_SECRET) {
  console.warn('WHATSAPP_APP_SECRET is not set — WhatsApp webhook signature verification will reject all updates.')
}
if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_WEBHOOK_SECRET) {
  console.warn('TELEGRAM_WEBHOOK_SECRET is not set — set it via setWebhook secret_token and configure it here.')
}

const runningTasks = new Set<string>()

// ---------- Auth ----------
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' })
    return
  }
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7))
    if (error || !user) { res.status(401).json({ error: 'Invalid or expired token' }); return }
    ;(req as express.Request & { user: { id: string } }).user = { id: user.id }
    next()
  } catch {
    res.status(401).json({ error: 'Auth check failed' })
  }
}

// ---------- Health ----------
app.get('/health', async (_req, res) => {
  const model = await getModelStatus()
  let db: 'ok' | 'error' = 'ok'
  try {
    const { error } = await getSupabaseClient().from('agent_tasks').select('id', { count: 'exact', head: true })
    if (error) db = 'error'
  } catch { db = 'error' }
  res.json({
    status: model.ready && db === 'ok' ? 'ok' : 'degraded',
    model: { ready: model.ready, servedModelId: model.servedModelId ?? null, configuredModel: process.env.MODEL_NAME || 'DeepSeek-V4.1-Flash', error: model.error },
    db,
    queue: 'watching',
    agents: Object.keys(AGENT_REGISTRY),
  })
})

// ---------- SSE stream (ownership-checked) ----------
app.get('/stream/:taskId', requireAuth, async (req, res) => {
  const { taskId } = req.params
  const { data: task } = await getSupabaseClient().from('agent_tasks').select('user_id').eq('id', taskId).single()
  if (!task || task.user_id !== (req as express.Request & { user: { id: string } }).user.id) {
    res.status(404).json({ error: 'Task not found' })
    return
  }
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  const unsubscribe = subscribe(taskId, (event) => res.write(`data: ${JSON.stringify(event)}\n\n`))
  req.on('close', unsubscribe)
})

// ---------- Run ----------
app.post('/run', requireAuth, async (req, res) => {
  const body = req.body as {
    goal?: unknown
    channel?: unknown
    channelMeta?: unknown
    answers?: unknown
    skipDiscovery?: unknown
  }
  const userId = (req as express.Request & { user: { id: string } }).user.id
  if (typeof body.goal !== 'string' || !body.goal.trim()) {
    res.status(400).json({ error: 'goal must be a non-empty string' })
    return
  }
  if (body.channel !== undefined && !['web', 'whatsapp', 'telegram'].includes(String(body.channel))) {
    res.status(400).json({ error: 'Unsupported channel' })
    return
  }

  const { data: task, error } = await getSupabaseClient().from('agent_tasks').insert({
    user_id: userId,
    goal: body.goal,
    agent: 'nexus',
    status: 'queued',
    input: {
      goal: body.goal, userId,
      channel: body.channel ?? 'web',
      channelMeta: body.channelMeta,
      ...(typeof body.answers === 'object' && body.answers !== null ? { answers: body.answers } : {}),
      ...(body.skipDiscovery === true ? { skipDiscovery: true } : {}),
    },
  }).select('id').single()

  if (error || !task) { res.status(500).json({ error: 'Failed to create task' }); return }
  res.json({ taskId: task.id })
})

// ---------- Webhooks (verified senders only) ----------
app.post('/webhooks/whatsapp', async (req, res) => {
  const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody
  const signature = req.headers['x-hub-signature-256'] as string | undefined
  if (!verifyWhatsAppSignature(rawBody ?? JSON.stringify(req.body), signature, process.env.WHATSAPP_APP_SECRET ?? '')) {
    res.status(403).json({ error: 'Invalid webhook signature' })
    return
  }
  res.sendStatus(200)
  try {
    const entry = (req.body as any)?.entry?.[0]?.changes?.[0]?.value
    const message = entry?.messages?.[0]
    if (!message) return
    await handleWhatsApp({ from: message.from, body: message.text?.body ?? '', messageId: message.id, timestamp: message.timestamp })
  } catch (e) {
    console.error('WhatsApp handling failed:', e instanceof Error ? e.message : String(e))
  }
})

app.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  const expected = process.env.WHATSAPP_VERIFY_TOKEN
  if (mode === 'subscribe' && expected && token === expected && typeof challenge === 'string') {
    res.status(200).type('text/plain').send(challenge)
    return
  }
  res.status(403).json({ error: 'Webhook verification failed' })
})

app.post('/webhooks/telegram', async (req, res) => {
  const secretHeader = req.headers['x-telegram-bot-api-secret-token'] as string | undefined
  if (!verifyTelegramSecret(secretHeader, process.env.TELEGRAM_WEBHOOK_SECRET ?? '')) {
    res.status(403).json({ error: 'Invalid webhook secret' })
    return
  }
  res.sendStatus(200)
  try {
    const message = (req.body as any)?.message
    if (!message) return
    await handleTelegram({
      chatId: message.chat.id,
      text: message.text ?? '',
      messageId: message.message_id,
      from: { id: message.from.id, username: message.from.username },
    })
  } catch (e) {
    console.error('Telegram handling failed:', e instanceof Error ? e.message : String(e))
  }
})

// ---------- Social platform integrations ----------
app.get('/platforms', requireAuth, (_req, res) => {
  res.json({
    platforms: supportedPlatforms().map(p => ({
      platform: p,
      capabilities: getAdapter(p)?.requiredScopes ?? [],
    })),
  })
})

app.post('/platforms/:platform/connect', requireAuth, async (req, res) => {
  const platform = req.params.platform as PlatformId
  if (!getAdapter(platform)) { res.status(400).json({ error: `Unsupported platform: ${platform}` }); return }
  const { handle, credentials, scopes, autoApprove } = req.body as {
    handle?: unknown; credentials?: unknown; scopes?: unknown; autoApprove?: unknown
  }
  if (typeof handle !== 'string' || !handle || typeof credentials !== 'object' || credentials === null) {
    res.status(400).json({ error: 'handle and credentials are required' })
    return
  }
  try {
    const connection = await upsertConnection(
      (req as express.Request & { user: { id: string } }).user.id,
      platform, handle,
      credentials as Record<string, unknown>,
      Array.isArray(scopes) ? scopes.map(String) : [],
      autoApprove === true,
    )
    res.json({ ok: true, platform: connection.platform, handle: connection.handle, status: connection.status })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

app.post('/platforms/:platform/status', requireAuth, async (req, res) => {
  const platform = req.params.platform as PlatformId
  const result = await verifyConnection((req as express.Request & { user: { id: string } }).user.id, platform)
  res.status(result.ok ? 200 : 400).json(result)
})

app.post('/publish', requireAuth, async (req, res) => {
  const { platform, text, mediaUrls, taskId } = req.body as {
    platform?: unknown; text?: unknown; mediaUrls?: unknown; taskId?: unknown
  }
  if (typeof platform !== 'string' || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'platform and non-empty text are required' })
    return
  }
  const outcome = await publishWithApproval(
    (req as express.Request & { user: { id: string } }).user.id,
    platform as PlatformId,
    { text, mediaUrls: Array.isArray(mediaUrls) ? mediaUrls.map(String) : undefined },
    typeof taskId === 'string' ? taskId : undefined,
  )
  res.status(outcome.ok ? 200 : outcome.reason === 'approval_required' ? 202 : 400).json(outcome)
})

app.get('/analytics/:platform', requireAuth, async (req, res) => {
  const days = Number(req.query['days'] ?? 7)
  const result = await getAnalyticsFor((req as express.Request & { user: { id: string } }).user.id, req.params.platform as PlatformId, Number.isFinite(days) ? days : 7)
  res.status(result.ok ? 200 : 400).json(result)
})

app.post('/approvals/:id', requireAuth, async (req, res) => {
  const decision = (req.body as { decision?: unknown })?.decision
  if (decision !== 'approved' && decision !== 'denied') { res.status(400).json({ error: 'decision must be approved or denied' }); return }
  try {
    await decideApproval(req.params.id, (req as express.Request & { user: { id: string } }).user.id, decision)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) })
  }
})

// ---------- Queue watcher ----------
async function processQueuedTask(payloadNew: unknown) {
  let task
  try { task = mapAgentTaskRow(payloadNew) } catch (error) {
    console.error('Ignoring invalid agent_tasks row:', error instanceof Error ? error.message : String(error))
    return
  }
  if (task.agent !== 'nexus' || runningTasks.has(task.id)) return
  runningTasks.add(task.id)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000)
  try {
    await runNexus(task, controller.signal)
  } catch (error) {
    console.error('NEXUS task failed:', error instanceof Error ? error.message : String(error))
    try {
      await getSupabaseClient().from('agent_tasks')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', task.id)
    } catch { /* best-effort */ }
  } finally {
    clearTimeout(timeout)
    runningTasks.delete(task.id)
  }
}

function watchTaskQueue() {
  getSupabaseClient().channel('agent-tasks')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_tasks', filter: 'status=eq.queued' },
      (payload) => { void processQueuedTask(payload.new) })
    .subscribe()
  console.log('Watching Supabase for queued tasks...')
}

/** Startup recovery: execute any tasks orphaned in 'queued' by a previous shutdown. */
async function recoverOrphanedTasks() {
  try {
    const taskIds = await sweepQueuedTasks()
    if (!taskIds.length) return
    console.log(`Recovering ${taskIds.length} orphaned queued task(s)...`)
    for (const id of taskIds) {
      const { data, error } = await getSupabaseClient().from('agent_tasks')
        .select('*').eq('id', id).eq('agent', 'nexus').eq('status', 'queued').maybeSingle()
      if (error) {
        console.error(`Could not load queued task ${id}:`, error.message)
        continue
      }
      if (data) await processQueuedTask(data)
    }
  } catch (e) {
    console.error('Orphaned-task recovery failed:', e instanceof Error ? e.message : String(e))
  }
}

// ---------- Boot: HTTP always up; watcher waits for the model ----------
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason instanceof Error ? reason.message : String(reason))
})

const PORT = Number(process.env.PORT ?? 3000)
app.listen(PORT, () => {
  console.log(`NexoraOS Agent Server running on port ${PORT}`)
  startScheduler()
  void (async () => {
    console.log('Waiting for model endpoint readiness...')
    let attempts = 0
    while (!(await modelReady()) && attempts < 60) {
      await new Promise(r => setTimeout(r, 5000))
      attempts++
      process.stdout.write('.')
    }
    if (await modelReady()) {
      console.log('\nModel endpoint ready — agents online')
      await recoverOrphanedTasks()
      watchTaskQueue()
    } else {
      console.error('\nModel endpoint not ready after five minutes — server stays up; /health reports degraded. Queue watcher NOT started.')
    }
  })()
})

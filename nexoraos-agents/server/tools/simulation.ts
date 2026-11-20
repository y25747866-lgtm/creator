/**
 * MiroFish swarm simulation adapter for SCOUT.
 *
 * This ports the SimulationRunner lifecycle into an HTTP orchestration layer:
 * create a project and ontology, build its Zep graph, prepare OASIS personas,
 * start the runner, wait for a terminal state, and request the prediction report.
 * The Python backend remains responsible for its OASIS subprocess management.
 */

interface ApiEnvelope<T> {
  success?: boolean
  data?: T
  error?: string
}

interface TaskState {
  task_id?: string
  report_id?: string
  already_prepared?: boolean
  status?: string
  progress?: number
  message?: string
  error?: string
  result?: Record<string, unknown>
}

interface ProjectResponse {
  project_id?: string
  graph_id?: string
  status?: string
}

interface ProfileRecord {
  [key: string]: unknown
}

interface SimulationStatus {
  runner_status?: string
  error?: string
  current_round?: number
  total_rounds?: number
  total_actions_count?: number
  twitter_actions_count?: number
  reddit_actions_count?: number
}

export interface SwarmSimulationResult {
  predictionReport: string
  confidenceScore: number
  confidenceNote: string
  personaBreakdown: {
    totalPersonas: number
    byPlatform: Record<string, number>
    personas: Array<{
      platform: string
      name: string
      description?: string
      traits?: unknown
    }>
  }
  simulation: {
    projectId: string
    graphId: string
    simulationId: string
    completedRounds: number
    totalActions: number
    reportId?: string
  }
}

const DEFAULT_API_URL = 'http://localhost:5001'
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000
const DEFAULT_POLL_INTERVAL_MS = 2_000
const MAX_SEED_BYTES = 2_000_000

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function getNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function normaliseBaseUrl(): string {
  return (process.env.MIROFISH_API_URL || DEFAULT_API_URL).replace(/\/+$/, '')
}

function deadlineFromNow(): number {
  const configured = Number(process.env.MIROFISH_TIMEOUT_MS)
  const timeout = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS
  return Date.now() + timeout
}

function requestTimeout(deadline: number): AbortSignal {
  const remaining = deadline - Date.now()
  if (remaining <= 0) throw new Error('MiroFish simulation timed out.')
  return AbortSignal.timeout(remaining)
}

async function requestData<T>(path: string, deadline: number, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${normaliseBaseUrl()}${path}`, {
    ...init,
    headers,
    signal: requestTimeout(deadline),
  })
  const body = await response.json().catch(() => ({})) as ApiEnvelope<T>
  if (!response.ok || body.success === false) {
    throw new Error(`MiroFish ${path} failed (${response.status}): ${body.error || response.statusText}`)
  }
  if (!('data' in body)) throw new Error(`MiroFish ${path} returned no data.`)
  return body.data as T
}

function sleep(ms: number, deadline: number): Promise<void> {
  const remaining = deadline - Date.now()
  if (remaining <= 0) throw new Error('MiroFish simulation timed out.')
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('MiroFish simulation timed out.'))
    }, remaining)
    setTimeout(() => {
      clearTimeout(timeout)
      resolve()
    }, Math.min(ms, remaining))
  })
}

async function poll<T>(
  label: string,
  deadline: number,
  read: () => Promise<T>,
  isReady: (value: T) => boolean,
  isFailed: (value: T) => string | undefined,
): Promise<T> {
  const configured = Number(process.env.MIROFISH_POLL_INTERVAL_MS)
  const interval = Number.isFinite(configured) && configured >= 250 ? configured : DEFAULT_POLL_INTERVAL_MS
  while (Date.now() < deadline) {
    const value = await read()
    const failure = isFailed(value)
    if (failure) throw new Error(`MiroFish ${label} failed: ${failure}`)
    if (isReady(value)) return value
    await sleep(interval, deadline)
  }
  throw new Error(`Timed out waiting for MiroFish ${label}.`)
}

function taskFailure(task: TaskState): string | undefined {
  const status = (task.status || '').toLowerCase()
  return ['failed', 'error', 'cancelled', 'canceled'].includes(status) ? task.error || task.message || status : undefined
}

async function waitForTask(taskId: string, deadline: number, label: string): Promise<TaskState> {
  return poll(
    label,
    deadline,
    () => requestData<TaskState>(`/api/graph/task/${encodeURIComponent(taskId)}`, deadline),
    task => ['completed', 'complete', 'success', 'succeeded'].includes((task.status || '').toLowerCase()),
    taskFailure,
  )
}

async function waitForPrepare(taskId: string, simulationId: string, deadline: number): Promise<TaskState> {
  return poll(
    'persona preparation',
    deadline,
    () => requestData<TaskState>('/api/simulation/prepare/status', deadline, {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId, simulation_id: simulationId }),
    }),
    task => ['ready', 'completed', 'complete', 'success', 'succeeded'].includes((task.status || '').toLowerCase()) || task.already_prepared === true,
    taskFailure,
  )
}

async function waitForSimulation(simulationId: string, deadline: number): Promise<SimulationStatus> {
  return poll(
    'swarm execution',
    deadline,
    () => requestData<SimulationStatus>(`/api/simulation/${encodeURIComponent(simulationId)}/run-status`, deadline),
    status => ['completed', 'complete', 'success', 'succeeded', 'stopped'].includes((status.runner_status || '').toLowerCase()),
    status => ['failed', 'error'].includes((status.runner_status || '').toLowerCase())
      ? (status as SimulationStatus & { error?: string }).error || status.runner_status
      : undefined,
  )
}

async function waitForReport(taskId: string, simulationId: string, deadline: number): Promise<TaskState> {
  return poll(
    'prediction report',
    deadline,
    () => requestData<TaskState>('/api/report/generate/status', deadline, {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId, simulation_id: simulationId }),
    }),
    report => ['completed', 'complete', 'success', 'succeeded'].includes((report.status || '').toLowerCase()),
    taskFailure,
  )
}

function toPersona(platform: string, profile: ProfileRecord) {
  const name = getString(profile.name)
    || getString(profile.username)
    || getString(profile.user_name)
    || getString(profile.agent_name)
    || getString(profile.display_name)
    || `Persona ${getString(profile.agent_id) || getString(profile.id) || 'unknown'}`
  const description = getString(profile.persona)
    || getString(profile.description)
    || getString(profile.background)
    || getString(profile.occupation)
  const traits = profile.traits ?? profile.personality ?? profile.interests
  return { platform, name, ...(description ? { description } : {}), ...(traits !== undefined ? { traits } : {}) }
}

function deriveConfidence(personaCount: number, actionCount: number): number {
  // Coverage proxy, not a calibrated probability: report quality rises with
  // broader persona coverage and more observed simulation actions.
  const personaCoverage = 1 - Math.exp(-personaCount / 40)
  const actionCoverage = 1 - Math.exp(-actionCount / 600)
  return Math.round(Math.min(0.9, 0.25 + 0.35 * personaCoverage + 0.3 * actionCoverage) * 100) / 100
}

/** Run MiroFish's project → graph → prepare → SimulationRunner → report pipeline. */
export async function runSwarmSimulation(topic: string, seedData: string, userId: string): Promise<SwarmSimulationResult> {
  const cleanTopic = topic.trim()
  const cleanSeed = seedData.trim()
  if (!cleanTopic) throw new Error('Swarm simulation requires a non-empty topic.')
  if (!cleanSeed) throw new Error('Swarm simulation requires seed data from SCOUT research.')
  if (Buffer.byteLength(cleanSeed, 'utf8') > MAX_SEED_BYTES) {
    throw new Error(`Swarm simulation seed data exceeds the ${MAX_SEED_BYTES}-byte limit.`)
  }

  // User identity is intentionally not sent to MiroFish; its project API has no
  // user-scoping contract, and the topic/seed are sufficient simulation inputs.
  void userId
  const deadline = deadlineFromNow()
  const seedFile = new FormData()
  seedFile.append('simulation_requirement', `Simulate likely outcomes and stakeholder reactions for this topic: ${cleanTopic}`)
  seedFile.append('project_name', `NexoraOS SCOUT — ${cleanTopic.slice(0, 72)}`)
  seedFile.append('additional_context', 'Created by the NexoraOS SCOUT research workflow. Use the supplied seed evidence as the starting context; distinguish simulated behavior from verified real-world facts.')
  seedFile.append('files', new Blob([cleanSeed], { type: 'text/plain' }), 'scout-seed-data.txt')

  const project = await requestData<ProjectResponse>('/api/graph/ontology/generate', deadline, {
    method: 'POST',
    body: seedFile,
  })
  if (!project.project_id) throw new Error('MiroFish ontology generation returned no project_id.')
  const projectId = project.project_id

  const graphTask = await requestData<TaskState>('/api/graph/build', deadline, {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, graph_name: `SCOUT swarm: ${cleanTopic.slice(0, 72)}` }),
  })
  const graphTaskId = getString(graphTask.task_id)
  if (!graphTaskId) throw new Error('MiroFish graph build returned no task_id.')
  await waitForTask(graphTaskId, deadline, 'graph build')
  const builtProject = await requestData<ProjectResponse>(`/api/graph/project/${encodeURIComponent(projectId)}`, deadline)
  const graphId = getString(builtProject.graph_id)
  if (!graphId) throw new Error('MiroFish graph build completed without a graph_id.')

  const simulation = await requestData<{ simulation_id?: string }>('/api/simulation/create', deadline, {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, graph_id: graphId, enable_twitter: true, enable_reddit: true }),
  })
  if (!simulation.simulation_id) throw new Error('MiroFish simulation creation returned no simulation_id.')
  const simulationId = simulation.simulation_id

  const prepare = await requestData<TaskState>('/api/simulation/prepare', deadline, {
    method: 'POST',
    body: JSON.stringify({ simulation_id: simulationId, use_llm_for_profiles: true, parallel_profile_count: 5 }),
  })
  const prepareTaskId = getString(prepare.task_id)
  if ((prepare.status || '').toLowerCase() !== 'ready' && prepare.already_prepared !== true) {
    if (!prepareTaskId) throw new Error('MiroFish persona preparation returned no task_id.')
    await waitForPrepare(prepareTaskId, simulationId, deadline)
  }

  const configuredRounds = Number(process.env.MIROFISH_MAX_ROUNDS)
  const maxRounds = Number.isFinite(configuredRounds) && configuredRounds > 0 ? Math.floor(configuredRounds) : 3
  await requestData<Record<string, unknown>>('/api/simulation/start', deadline, {
    method: 'POST',
    body: JSON.stringify({ simulation_id: simulationId, platform: 'parallel', max_rounds: maxRounds }),
  })
  const runStatus = await waitForSimulation(simulationId, deadline)

  const reportStart = await requestData<TaskState>('/api/report/generate', deadline, {
    method: 'POST',
    body: JSON.stringify({ simulation_id: simulationId }),
  })
  const reportTaskId = getString(reportStart.task_id)
  const reportReady = reportTaskId
    ? await waitForReport(reportTaskId, simulationId, deadline)
    : reportStart
  const reportId = getString(reportReady.report_id) || getString(reportStart.report_id)
  if (!reportId) throw new Error('MiroFish report generation completed without a report_id.')
  const report = await requestData<Record<string, unknown>>(`/api/report/${encodeURIComponent(reportId)}`, deadline)
  const reportText = getString(report.markdown_content)
    || getString(report.report_content)
    || JSON.stringify(report.outline ?? report, null, 2)

  const [redditData, twitterData] = await Promise.all([
    requestData<{ profiles?: ProfileRecord[]; count?: number }>(`/api/simulation/${encodeURIComponent(simulationId)}/profiles?platform=reddit`, deadline).catch(() => ({ profiles: [] })),
    requestData<{ profiles?: ProfileRecord[]; count?: number }>(`/api/simulation/${encodeURIComponent(simulationId)}/profiles?platform=twitter`, deadline).catch(() => ({ profiles: [] })),
  ])
  const redditProfiles = Array.isArray(redditData.profiles) ? redditData.profiles : []
  const twitterProfiles = Array.isArray(twitterData.profiles) ? twitterData.profiles : []
  const personas = [
    ...redditProfiles.map(profile => toPersona('reddit', profile)),
    ...twitterProfiles.map(profile => toPersona('twitter', profile)),
  ]
  const actionCount = getNumber(runStatus.total_actions_count,
    getNumber(runStatus.twitter_actions_count) + getNumber(runStatus.reddit_actions_count))

  return {
    predictionReport: reportText,
    confidenceScore: deriveConfidence(personas.length, actionCount),
    confidenceNote: 'Heuristic coverage score (persona count and observed actions), not a calibrated probability or statistical confidence interval.',
    personaBreakdown: {
      totalPersonas: personas.length,
      byPlatform: { reddit: redditProfiles.length, twitter: twitterProfiles.length },
      personas: personas.slice(0, 100),
    },
    simulation: {
      projectId,
      graphId,
      simulationId,
      completedRounds: getNumber(runStatus.current_round),
      totalActions: actionCount,
      reportId,
    },
  }
}

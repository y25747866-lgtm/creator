/** Zep Cloud persistent memory for NEXUS. */
import { ZepClient } from '@getzep/zep-cloud'

export type MemoryRole = 'user' | 'assistant' | 'system' | 'tool' | 'function'

let cachedClient: ZepClient | undefined
function getClient(): ZepClient | null {
  const apiKey = process.env.ZEP_API_KEY?.trim()
  if (!apiKey) return null
  cachedClient ??= new ZepClient({ apiKey })
  return cachedClient
}

interface ZepUser {
  uuid?: string
  graphUuid?: string
}

async function ensureUser(userId: string): Promise<ZepUser | null> {
  const client = getClient()
  if (!client) return null
  const stableId = userId.trim()
  if (!stableId) throw new Error('Zep memory requires a non-empty userId.')
  try {
    return await client.user.lookup({ userId: stableId }) as ZepUser
  } catch {
    try {
      return await client.user.create({ userId: stableId }) as ZepUser
    } catch (createError) {
      // Concurrent first use can race on unique userId; resolve the winner.
      try {
        return await client.user.lookup({ userId: stableId }) as ZepUser
      } catch {
        throw createError
      }
    }
  }
}

/** Store one role-tagged memory as a message in the user's persistent graph. */
export async function addMemory(userId: string, role: MemoryRole, content: string): Promise<void> {
  const client = getClient()
  if (!client) return
  const user = await ensureUser(userId)
  if (!user?.uuid) throw new Error('Zep did not return a user UUID.')
  const thread = await client.thread.create({ userUuid: user.uuid })
  if (!thread.uuid) throw new Error('Zep did not return a thread UUID.')
  await client.thread.addMessages(thread.uuid, {
    messages: [{ role, content, name: 'nexoraos' }],
  })
}

/** Return a query-assembled memory context for future NEXUS tasks. */
export async function getMemory(userId: string): Promise<string> {
  const client = getClient()
  if (!client) return ''
  const user = await ensureUser(userId)
  if (!user?.graphUuid) return ''
  const result = await client.graph.getContext(user.graphUuid, {
    query: 'Relevant user background, goals, preferences, prior task outcomes, commitments, and decisions that should inform the next assistant task.',
    maxCharacters: 6_000,
  })
  return result.context?.trim() ?? ''
}

/** Search the user's long-term Zep graph for memories relevant to a query. */
export async function searchMemory(userId: string, query: string): Promise<string[]> {
  const client = getClient()
  if (!client) return []
  const cleanQuery = query.trim()
  if (!cleanQuery) return []
  const user = await ensureUser(userId)
  if (!user?.graphUuid) return []
  const results = await client.graph.searchEpisodes(user.graphUuid, {
    query: cleanQuery,
    pageSize: 10,
  })
  return results.data
    .map(episode => episode.content?.trim())
    .filter((content): content is string => Boolean(content))
}

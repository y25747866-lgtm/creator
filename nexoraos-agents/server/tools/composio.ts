/** Composio tool access used by APEX, implemented against the declared SDK API. */

import { Composio } from '@composio/core'
import type { ToolResult } from '../../shared/types.js'

let client: Composio | undefined

function getClient(): Composio {
  if (!client) {
    if (!process.env.COMPOSIO_API_KEY) throw new Error('COMPOSIO_API_KEY not set')
    client = new Composio({ apiKey: process.env.COMPOSIO_API_KEY })
  }
  return client
}

export interface ConnectedApp {
  name: string
  slug: string
  connected: boolean
}

/** Get tools from the user's active connected toolkits. */
export async function getUserTools(
  userId: string,
  toolkits?: string[],
  signal?: AbortSignal,
): Promise<ToolResult> {
  try {
    if (signal?.aborted) throw new Error('Operation aborted')
    const composio = getClient()
    const { items } = await composio.connectedAccounts.list({ userIds: [userId], statuses: ['ACTIVE'], limit: 100 })
    const selectedToolkits = toolkits?.length
      ? toolkits
      : [...new Set(items.map((account) => account.toolkit.slug))]

    if (selectedToolkits.length === 0) {
      return { ok: true, data: { sessionId: userId, tools: [] } }
    }

    const tools = await composio.tools.get(userId, { toolkits: selectedToolkits, limit: 100 })
    if (signal?.aborted) throw new Error('Operation aborted')
    return {
      ok: true,
      data: {
        // Compatibility alias for callers of the prior session-oriented wrapper;
        // the installed SDK has no session API and execution is user-scoped.
        sessionId: userId,
        tools: tools.flatMap((tool) => tool.type === 'function'
          ? [{ name: tool.function.name, description: tool.function.description }]
          : []),
      },
    }
  } catch (error) {
    return { ok: false, error: `Composio setup failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/** Execute a specific tool for an authenticated Composio user. */
export async function executeTool(
  userId: string,
  sessionId: string,
  toolName: string,
  input: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ToolResult> {
  try {
    void sessionId // retained for source/API compatibility; SDK execution is scoped by userId
    if (signal?.aborted) throw new Error('Operation aborted')
    const composio = getClient()
    const tools = await composio.tools.getRawComposioTools({ tools: [toolName] })
    const version = tools.find((tool) => tool.slug === toolName)?.version
    if (!version) return { ok: false, error: `Composio tool ${toolName} is unavailable or has no pinned version` }

    const result = await composio.tools.execute(toolName, { userId, version, arguments: input })
    if (signal?.aborted) return { ok: false, error: 'Operation was aborted after the Composio request; the SDK does not expose request cancellation.' }
    return result.successful
      ? { ok: true, data: result.data }
      : { ok: false, error: result.error ?? 'Composio tool execution failed' }
  } catch (error) {
    return { ok: false, error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/** List which Composio apps a user has connected. */
export async function listConnectedApps(userId: string): Promise<ConnectedApp[]> {
  try {
    const composio = getClient()
    const { items } = await composio.connectedAccounts.list({ userIds: [userId], limit: 100 })
    return items.map((account) => ({
      name: account.toolkit.slug,
      slug: account.toolkit.slug,
      connected: account.status === 'ACTIVE' && !account.isDisabled,
    }))
  } catch {
    return []
  }
}

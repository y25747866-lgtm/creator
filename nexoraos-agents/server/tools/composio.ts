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

type ConnectorAuthKind = 'oauth' | 'api_key' | 'bot_token'
type ConnectorConfig = { toolkit: string; name: string; authKind: ConnectorAuthKind }
type AuthConfigRecord = { id: string; name?: string; toolkit?: { slug?: string }; isComposioManaged?: boolean }

/** IDs accepted by the public endpoint. User input never selects an arbitrary toolkit. */
export const COMPOSIO_CONNECTORS: Record<string, ConnectorConfig> = {
  gmail: { toolkit: 'gmail', name: 'Gmail', authKind: 'oauth' },
  'google-calendar': { toolkit: 'googlecalendar', name: 'Google Calendar', authKind: 'oauth' },
  'google-drive': { toolkit: 'googledrive', name: 'Google Drive', authKind: 'oauth' },
  'google-docs': { toolkit: 'googledocs', name: 'Google Docs', authKind: 'oauth' },
  'google-sheets': { toolkit: 'googlesheets', name: 'Google Sheets', authKind: 'oauth' },
  outlook: { toolkit: 'outlook', name: 'Outlook', authKind: 'oauth' },
  notion: { toolkit: 'notion', name: 'Notion', authKind: 'oauth' },
  airtable: { toolkit: 'airtable', name: 'Airtable', authKind: 'oauth' },
  trello: { toolkit: 'trello', name: 'Trello', authKind: 'oauth' },
  asana: { toolkit: 'asana', name: 'Asana', authKind: 'oauth' },
  clickup: { toolkit: 'clickup', name: 'ClickUp', authKind: 'oauth' },
  linear: { toolkit: 'linear', name: 'Linear', authKind: 'oauth' },
  todoist: { toolkit: 'todoist', name: 'Todoist', authKind: 'oauth' },
  slack: { toolkit: 'slack', name: 'Slack', authKind: 'oauth' },
  discord: { toolkit: 'discord', name: 'Discord', authKind: 'oauth' },
  telegram: { toolkit: 'telegrambotapi', name: 'Telegram', authKind: 'bot_token' },
  whatsapp: { toolkit: 'whatsapp', name: 'WhatsApp', authKind: 'bot_token' },
  zoom: { toolkit: 'zoom', name: 'Zoom', authKind: 'oauth' },
  hubspot: { toolkit: 'hubspot', name: 'HubSpot', authKind: 'oauth' },
  salesforce: { toolkit: 'salesforce', name: 'Salesforce', authKind: 'oauth' },
  mailchimp: { toolkit: 'mailchimp', name: 'Mailchimp', authKind: 'api_key' },
  convertkit: { toolkit: 'kit', name: 'ConvertKit', authKind: 'api_key' },
  beehiiv: { toolkit: 'beehiiv', name: 'Beehiiv', authKind: 'api_key' },
  omnisend: { toolkit: 'omnisend', name: 'Omnisend', authKind: 'api_key' },
  linkedin: { toolkit: 'linkedin', name: 'LinkedIn', authKind: 'oauth' },
  twitter: { toolkit: 'twitter', name: 'Twitter/X', authKind: 'oauth' },
  instagram: { toolkit: 'instagram', name: 'Instagram', authKind: 'oauth' },
  'meta-ads': { toolkit: 'facebookads', name: 'Meta Ads', authKind: 'oauth' },
  stripe: { toolkit: 'stripe', name: 'Stripe', authKind: 'api_key' },
  whop: { toolkit: 'whop', name: 'Whop', authKind: 'oauth' },
  gumroad: { toolkit: 'gumroad', name: 'Gumroad', authKind: 'oauth' },
  'lemon-squeezy': { toolkit: 'lemonsqueezy', name: 'Lemon Squeezy', authKind: 'oauth' },
  shopify: { toolkit: 'shopify', name: 'Shopify', authKind: 'oauth' },
  zapier: { toolkit: 'zapier', name: 'Zapier', authKind: 'oauth' },
  make: { toolkit: 'make', name: 'Make', authKind: 'oauth' },
  n8n: { toolkit: 'n8n', name: 'n8n', authKind: 'api_key' },
  perplexity: { toolkit: 'perplexityai', name: 'Perplexity', authKind: 'api_key' },
  firecrawl: { toolkit: 'firecrawl', name: 'Firecrawl', authKind: 'api_key' },
}

const authConfigIdCache = new Map<string, Promise<string>>()

type ComposioConnectorApi = {
  authConfigs: {
    list: (query: Record<string, unknown>) => Promise<{ items?: AuthConfigRecord[] }>
    create: (toolkit: string, options: Record<string, unknown>) => Promise<AuthConfigRecord>
  }
  connectedAccounts: {
    link: (userId: string, authConfigId: string, options: { callbackUrl: string }) => Promise<{ redirectUrl?: string }>
  }
}

async function getOrCreateAuthConfig(connectorId: string, connector: ConnectorConfig): Promise<string> {
  const composio = getClient() as unknown as ComposioConnectorApi
  const cached = authConfigIdCache.get(connectorId)
  if (cached) return cached

  const pending = (async () => {
    const isManaged = connector.authKind === 'oauth'
    const response = await composio.authConfigs.list({ toolkit: connector.toolkit, isComposioManaged: isManaged, limit: 100 })
    const existing = (response.items ?? []).find((item) =>
      item.toolkit?.slug === connector.toolkit &&
      (isManaged ? item.isComposioManaged === true : item.name === `NexoraOS ${connectorId}`),
    )
    if (existing?.id) return existing.id

    const options = isManaged
      ? { type: 'use_composio_managed_auth', name: `NexoraOS ${connector.name}` }
      : { type: 'use_custom_auth', authScheme: 'API_KEY', name: `NexoraOS ${connectorId}`, credentials: {} }
    const created = await composio.authConfigs.create(connector.toolkit, options)
    if (!created?.id) throw new Error(`Composio did not return an auth config for ${connector.name}.`)
    return created.id
  })()

  authConfigIdCache.set(connectorId, pending)
  try {
    return await pending
  } catch (error) {
    authConfigIdCache.delete(connectorId)
    throw error
  }
}

/** Create a Composio-hosted authorization link for the authenticated NexoraOS user. */
export async function createConnectorLink(userId: string, connectorId: string, callbackUrl: string): Promise<string> {
  const connector = COMPOSIO_CONNECTORS[connectorId]
  if (!connector) throw new Error('This connector is not available in the curated catalog.')
  if (!userId) throw new Error('An authenticated user is required.')
  if (!callbackUrl) throw new Error('CONNECTOR_CALLBACK_URL is not configured on the agent service.')

  const composio = getClient() as unknown as ComposioConnectorApi
  const authConfigId = await getOrCreateAuthConfig(connectorId, connector)
  const link = await composio.connectedAccounts.link(userId, authConfigId, { callbackUrl })
  if (!link?.redirectUrl) throw new Error(`Composio did not return a connection URL for ${connector.name}.`)
  return link.redirectUrl
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
  const composio = getClient()
  const { items } = await composio.connectedAccounts.list({ userIds: [userId], limit: 100 })
  return items.map((account) => ({
    name: account.toolkit.slug,
    slug: account.toolkit.slug,
    connected: account.status === 'ACTIVE' && !account.isDisabled,
  }))
}

/**
 * Platform registry + approval-gated publishing.
 * The first publish for a user/platform always requires an explicit approval row;
 * after approval, publishing proceeds if the connection is active and the
 * platform API confirms success. Nothing is reported as published otherwise.
 */
import { randomUUID } from 'node:crypto'
import { getSupabaseClient } from '../db/client.js'
import { emit } from '../events/bus.js'
import { xAdapter } from './x.js'
import { facebookAdapter } from './facebook.js'
import { instagramAdapter } from './instagram.js'
import type { PlatformAdapter, PlatformConnection, PlatformId, PublishInput, PublishOutcome } from './types.js'
import { mapConnectionRow } from './types.js'
import { encryptCredentials } from './credentials.js'

export { mapConnectionRow }
export type { PlatformConnection, PlatformId, PublishInput, PublishOutcome }

const ADAPTERS: Record<PlatformId, PlatformAdapter> = {
  x: xAdapter,
  facebook: facebookAdapter,
  instagram: instagramAdapter,
}

export function getAdapter(platform: string): PlatformAdapter | null {
  return (ADAPTERS as Record<string, PlatformAdapter>)[platform] ?? null
}

export function supportedPlatforms(): PlatformId[] {
  return Object.keys(ADAPTERS) as PlatformId[]
}

export async function getConnection(userId: string, platform: PlatformId): Promise<PlatformConnection | null> {
  const { data } = await getSupabaseClient()
    .from('platform_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('status', 'active')
    .limit(1)
    .single()
  return data ? mapConnectionRow(data as Record<string, unknown>) : null
}

/** Store or refresh a connection. Credentials are stored server-side, never echoed back. */
export async function upsertConnection(
  userId: string,
  platform: PlatformId,
  handle: string,
  credentials: Record<string, unknown>,
  scopes: string[],
  autoApprove = false,
): Promise<PlatformConnection> {
  const { data, error } = await getSupabaseClient().from('platform_connections').upsert({
    user_id: userId,
    platform,
    handle,
    credentials: encryptCredentials(credentials),
    scopes,
    status: 'active',
    auto_approve: autoApprove,
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' }).select('*').single()
  if (error) throw new Error(`Failed to save ${platform} connection: ${error.message}`)
  return mapConnectionRow(data as Record<string, unknown>)
}

/** Verify a connection against the live API; reflects auth failures into the stored status. */
export async function verifyConnection(userId: string, platform: PlatformId) {
  const adapter = getAdapter(platform)
  if (!adapter) return { ok: false as const, error: `Unsupported platform: ${platform}` }
  const connection = await getConnection(userId, platform)
  if (!connection) return { ok: false as const, error: `No active ${platform} connection. Connect the account first.` }
  const result = await adapter.verifyConnection(connection)
  if (!result.ok) {
    const expired = /expired|401|revoked/i.test(result.error ?? '')
    await getSupabaseClient().from('platform_connections')
      .update({ status: expired ? 'expired' : 'error', updated_at: new Date().toISOString() })
      .eq('id', connection.id)
    return { ok: false as const, error: result.error, status: expired ? 'expired' : 'error' }
  }
  await getSupabaseClient().from('platform_connections')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', connection.id)
  return { ok: true as const, handle: (result.data as { handle?: string } | undefined)?.handle ?? connection.handle, capabilities: adapter.requiredScopes }
}

async function hasApprovedPublish(userId: string, platform: PlatformId): Promise<boolean> {
  const { data } = await getSupabaseClient().from('approvals')
    .select('id')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('action', 'publish')
    .eq('status', 'approved')
    .limit(1)
  return !!data?.length
}

/** Approve (or deny) a pending publishing approval. */
export async function decideApproval(approvalId: string, userId: string, decision: 'approved' | 'denied') {
  const { error } = await getSupabaseClient().from('approvals')
    .update({ status: decision })
    .eq('id', approvalId)
    .eq('user_id', userId)
  if (error) throw new Error(`Failed to update approval: ${error.message}`)
}

/**
 * Publish with approval gate. First-ever publish for a user/platform creates an
 * approval request and returns approval_required. Never fabricates success.
 */
export async function publishWithApproval(
  userId: string,
  platform: PlatformId,
  input: PublishInput,
  taskId?: string,
): Promise<PublishOutcome> {
  const adapter = getAdapter(platform)
  if (!adapter) return { ok: false, confirmed: false, reason: 'unsupported', error: `Unsupported platform: ${platform}` }

  const connection = await getConnection(userId, platform)
  if (!connection) return { ok: false, confirmed: false, reason: 'not_connected', error: `No active ${platform} connection.` }

  const approved = connection.autoApprove || await hasApprovedPublish(userId, platform)
  if (!approved) {
    const approvalId = randomUUID()
    const { error } = await getSupabaseClient().from('approvals').insert({
      id: approvalId,
      user_id: userId,
      platform,
      action: 'publish',
      status: 'pending',
      payload: { text: input.text, mediaUrls: input.mediaUrls ?? [] },
      created_at: new Date().toISOString(),
    })
    if (error) return { ok: false, confirmed: false, reason: 'api_error', error: `Failed to create approval: ${error.message}` }
    if (taskId) await emit('nexus', taskId, 'approval.required', { approvalId, platform, summary: `Approve first ${platform} post for @${connection.handle}` })
    return { ok: false, confirmed: false, reason: 'approval_required', error: `Publishing to ${platform} requires user approval (approval ${approvalId})`, details: approvalId }
  }

  const outcome = await adapter.publish(connection, input)
  if (!outcome.ok && outcome.reason === 'expired_credentials') {
    await getSupabaseClient().from('platform_connections')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', connection.id)
  }
  return outcome
}

export async function getAnalyticsFor(userId: string, platform: PlatformId, days = 7) {
  const adapter = getAdapter(platform)
  if (!adapter) return { ok: false as const, reason: 'unsupported' as const, error: `Unsupported platform: ${platform}` }
  const connection = await getConnection(userId, platform)
  if (!connection) return { ok: false as const, reason: 'not_connected' as const, error: `No active ${platform} connection.` }
  return adapter.getAnalytics(connection, days)
}

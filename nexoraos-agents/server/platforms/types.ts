/**
 * Social platform integration contract.
 * Each adapter talks to one official API and reports failures explicitly —
 * a post is only "published" when the platform API confirms it.
 */
import type { ToolResult } from '../../shared/types.js'
import { decryptCredentials } from './credentials.js'

export type PlatformId = 'x' | 'facebook' | 'instagram'

export interface PlatformConnection {
  id: string
  userId: string
  platform: PlatformId
  handle: string
  status: 'active' | 'expired' | 'error'
  scopes: string[]
  credentials: Record<string, unknown> // access/refresh tokens — never log these
  autoApprove: boolean
  updatedAt: string
}

export interface PublishInput {
  text: string
  mediaUrls?: string[]
}

export interface PublishOutcome {
  ok: boolean
  platformPostId?: string
  platformPermalink?: string
  confirmed: boolean // true ONLY when the API confirmed creation
  error?: string
  reason?: 'not_connected' | 'expired_credentials' | 'approval_required' | 'api_error' | 'unsupported'
  details?: string
}

export interface AnalyticsResult {
  ok: boolean
  metrics?: Array<{ name: string; value: number; period?: string }>
  error?: string
  reason?: 'unsupported' | 'api_error' | 'not_connected'
}

export interface PlatformAdapter {
  platform: PlatformId
  requiredScopes: string[]
  /** Call a lightweight authenticated endpoint to verify the connection is alive. */
  verifyConnection(connection: PlatformConnection): Promise<ToolResult>
  publish(connection: PlatformConnection, input: PublishInput): Promise<PublishOutcome>
  getAnalytics(connection: PlatformConnection, days?: number): Promise<AnalyticsResult>
}

export function mapConnectionRow(row: Record<string, unknown>): PlatformConnection {
  return {
    id: String(row.id ?? ''),
    userId: String(row.user_id ?? ''),
    platform: row.platform as PlatformId,
    handle: String(row.handle ?? ''),
    status: (row.status as PlatformConnection['status']) ?? 'error',
    scopes: (row.scopes as string[]) ?? [],
    credentials: decryptCredentials(row.credentials),
    autoApprove: Boolean(row.auto_approve),
    updatedAt: String(row.updated_at ?? ''),
  }
}

/**
 * Facebook Pages adapter — official Graph API.
 * Requires a Page access token with pages_manage_posts+pages_read_engagement.
 */
import type { PlatformAdapter, PlatformConnection, PublishInput, PublishOutcome, AnalyticsResult } from './types.js'

const GRAPH = 'https://graph.facebook.com/v19.0'

function pageToken(connection: PlatformConnection): string | null {
  const t = connection.credentials['pageAccessToken']
  return typeof t === 'string' && t ? t : null
}

export const facebookAdapter: PlatformAdapter = {
  platform: 'facebook',
  requiredScopes: ['pages_manage_posts', 'pages_read_engagement'],

  async verifyConnection(connection) {
    const token = pageToken(connection)
    if (!token) return { ok: false, error: 'Facebook: no page access token stored' }
    try {
      const res = await fetch(`${GRAPH}/me?access_token=${encodeURIComponent(token)}`)
      if (res.status === 190 || res.status === 401) return { ok: false, error: 'Facebook: page token expired (OAuth error)' }
      if (!res.ok) return { ok: false, error: `Facebook: verification failed (HTTP ${res.status})` }
      const data = await res.json() as { name?: string }
      return { ok: true, data: { handle: data.name ?? connection.handle } }
    } catch (e) {
      return { ok: false, error: `Facebook: verification failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },

  async publish(connection, input: PublishInput): Promise<PublishOutcome> {
    const token = pageToken(connection)
    if (!token) return { ok: false, confirmed: false, reason: 'not_connected', error: 'Facebook: no page access token stored' }
    const pageId = connection.credentials['pageId']
    if (typeof pageId !== 'string' || !pageId) return { ok: false, confirmed: false, reason: 'unsupported', error: 'Facebook: pageId missing from connection' }
    try {
      const body: Record<string, string> = { access_token: token, message: input.text }
      if (input.mediaUrls?.[0]) body['link'] = input.mediaUrls[0]
      const res = await fetch(`${GRAPH}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { id?: string; error?: { message?: string } }
      if (!res.ok || data.error) {
        const msg = data.error?.message ?? `HTTP ${res.status}`
        return { ok: false, confirmed: false, reason: 'api_error', error: `Facebook: publish failed: ${msg}` }
      }
      if (!data.id) return { ok: false, confirmed: false, reason: 'api_error', error: 'Facebook: no post id returned — not confirming publication' }
      return { ok: true, confirmed: true, platformPostId: data.id, platformPermalink: `https://www.facebook.com/${data.id}` }
    } catch (e) {
      return { ok: false, confirmed: false, reason: 'api_error', error: `Facebook: publish failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },

  async getAnalytics(connection, _days = 7): Promise<AnalyticsResult> {
    const token = pageToken(connection)
    const pageId = connection.credentials['pageId']
    if (!token || typeof pageId !== 'string') return { ok: false, reason: 'not_connected', error: 'Facebook: connection incomplete' }
    try {
      const res = await fetch(`${GRAPH}/${pageId}/insights?metric=page_impressions,page_engaged_users,page_fans&access_token=${encodeURIComponent(token)}`)
      const data = await res.json() as { data?: Array<{ name?: string; values?: Array<{ value?: number }> }>; error?: { message?: string } }
      if (!res.ok || data.error) return { ok: false, reason: 'api_error', error: `Facebook: insights failed: ${data.error?.message ?? `HTTP ${res.status}`}` }
      return {
        ok: true,
        metrics: (data.data ?? []).map(m => ({ name: m.name ?? 'unknown', value: m.values?.[0]?.value ?? 0, period: 'latest' })),
      }
    } catch (e) {
      return { ok: false, reason: 'api_error', error: `Facebook: analytics failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },
}

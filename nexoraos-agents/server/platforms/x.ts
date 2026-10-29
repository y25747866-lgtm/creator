/**
 * X (Twitter) adapter — official API v2.
 * Requires an OAuth 2.0 user access token with tweet.read+tweet.write+users.read.
 * Token is stored in platform_connections.credentials.accessToken (never logged).
 */
import type { PlatformAdapter, PlatformConnection, PublishInput, PublishOutcome, AnalyticsResult } from './types.js'

const API = 'https://api.x.com/2'

export const xAdapter: PlatformAdapter = {
  platform: 'x',
  requiredScopes: ['tweet.read', 'tweet.write', 'users.read'],

  async verifyConnection(connection) {
    const token = connection.credentials['accessToken']
    if (typeof token !== 'string' || !token) return { ok: false, error: 'X: no access token stored for this connection' }
    try {
      const res = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) return { ok: false, error: 'X: credentials expired or revoked (HTTP 401)' }
      if (!res.ok) return { ok: false, error: `X: verification failed (HTTP ${res.status})` }
      const data = await res.json() as { data?: { username?: string } }
      return { ok: true, data: { handle: data.data?.username ?? connection.handle } }
    } catch (e) {
      return { ok: false, error: `X: verification failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },

  async publish(connection, input: PublishInput): Promise<PublishOutcome> {
    const token = connection.credentials['accessToken']
    if (typeof token !== 'string' || !token) {
      return { ok: false, confirmed: false, reason: 'not_connected', error: 'X: no access token stored' }
    }
    if (input.text.length > 280) {
      return { ok: false, confirmed: false, reason: 'unsupported', error: 'X: text exceeds 280 characters; splitting threads is not implemented yet' }
    }
    try {
      const res = await fetch(`${API}/tweets`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.text }),
      })
      if (res.status === 401) return { ok: false, confirmed: false, reason: 'expired_credentials', error: 'X: HTTP 401 — refresh or reconnect the account' }
      if (res.status === 403) return { ok: false, confirmed: false, reason: 'api_error', error: 'X: HTTP 403 — token lacks tweet.write scope or account is restricted', details: (await res.text().catch(() => '')).slice(0, 300) }
      if (!res.ok) return { ok: false, confirmed: false, reason: 'api_error', error: `X: publish failed (HTTP ${res.status})`, details: (await res.text().catch(() => '')).slice(0, 300) }
      const data = await res.json() as { data?: { id?: string; text?: string } }
      if (!data.data?.id) return { ok: false, confirmed: false, reason: 'api_error', error: 'X: API response contained no tweet id — not confirming publication' }
      return {
        ok: true,
        confirmed: true,
        platformPostId: data.data.id,
        platformPermalink: `https://x.com/i/web/status/${data.data.id}`,
      }
    } catch (e) {
      return { ok: false, confirmed: false, reason: 'api_error', error: `X: publish failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },

  async getAnalytics(connection, days = 7): Promise<AnalyticsResult> {
    const token = connection.credentials['accessToken']
    if (typeof token !== 'string' || !token) return { ok: false, reason: 'not_connected', error: 'X: no access token stored' }
    try {
      const me = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (!me.ok) return { ok: false, reason: 'api_error', error: `X: users/me failed (HTTP ${me.status})` }
      const meData = await me.json() as { data?: { id?: string; public_metrics?: Record<string, number> } }
      const metrics = Object.entries(meData.data?.public_metrics ?? {}).map(([name, value]) => ({ name, value }))
      return { ok: true, metrics, }
    } catch (e) {
      return { ok: false, reason: 'api_error', error: `X: analytics failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },
}

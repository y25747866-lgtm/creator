/**
 * Instagram adapter — official Graph API content publishing (two-step container flow).
 * Requires an IG Business/Creator account connected to a FB Page, a Page-scoped
 * token with instagram_basic+instagram_content_publish+pages_read_engagement.
 * Stories/Reels/carousels are NOT implemented — reported as unsupported.
 */
import type { PlatformAdapter, PlatformConnection, PublishInput, PublishOutcome, AnalyticsResult } from './types.js'

const GRAPH = 'https://graph.facebook.com/v19.0'

function tokenOf(connection: PlatformConnection): string | null {
  const t = connection.credentials['pageAccessToken']
  return typeof t === 'string' && t ? t : null
}

export const instagramAdapter: PlatformAdapter = {
  platform: 'instagram',
  requiredScopes: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'],

  async verifyConnection(connection) {
    const token = tokenOf(connection)
    const igUserId = connection.credentials['igUserId']
    if (!token || typeof igUserId !== 'string') return { ok: false, error: 'Instagram: connection incomplete (missing token or igUserId)' }
    try {
      const res = await fetch(`${GRAPH}/${igUserId}?fields=username,media_count&access_token=${encodeURIComponent(token)}`)
      if (!res.ok) return { ok: false, error: `Instagram: verification failed (HTTP ${res.status})` }
      const data = await res.json() as { username?: string }
      return { ok: true, data: { handle: data.username ?? connection.handle } }
    } catch (e) {
      return { ok: false, error: `Instagram: verification failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },

  async publish(connection, input: PublishInput): Promise<PublishOutcome> {
    const token = tokenOf(connection)
    const igUserId = connection.credentials['igUserId']
    if (!token || typeof igUserId !== 'string') return { ok: false, confirmed: false, reason: 'not_connected', error: 'Instagram: connection incomplete' }
    const imageUrl = input.mediaUrls?.[0]
    if (!imageUrl) return { ok: false, confirmed: false, reason: 'unsupported', error: 'Instagram: publishing requires an image URL; text-only posts are not supported by the Graph API' }
    try {
      // Step 1: create media container
      const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token, image_url: imageUrl, caption: input.text }),
      })
      const container = await containerRes.json() as { id?: string; error?: { message?: string } }
      if (!containerRes.ok || !container.id) {
        return { ok: false, confirmed: false, reason: 'api_error', error: `Instagram: media container failed: ${container.error?.message ?? `HTTP ${containerRes.status}`}` }
      }
      // Step 2: publish container
      const pubRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token, creation_id: container.id }),
      })
      const published = await pubRes.json() as { id?: string; error?: { message?: string } }
      if (!pubRes.ok || !published.id) {
        return { ok: false, confirmed: false, reason: 'api_error', error: `Instagram: publish failed: ${published.error?.message ?? `HTTP ${pubRes.status}`}` }
      }
      return { ok: true, confirmed: true, platformPostId: published.id }
    } catch (e) {
      return { ok: false, confirmed: false, reason: 'api_error', error: `Instagram: publish failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },

  async getAnalytics(connection, _days = 7): Promise<AnalyticsResult> {
    const token = tokenOf(connection)
    const igUserId = connection.credentials['igUserId']
    if (!token || typeof igUserId !== 'string') return { ok: false, reason: 'not_connected', error: 'Instagram: connection incomplete' }
    try {
      const res = await fetch(`${GRAPH}/${igUserId}/insights?metric=impressions,reach,profile_views,follower_count&access_token=${encodeURIComponent(token)}`)
      const data = await res.json() as { data?: Array<{ name?: string; values?: Array<{ value?: number }> }>; error?: { message?: string } }
      if (!res.ok || data.error) return { ok: false, reason: 'api_error', error: `Instagram: insights failed: ${data.error?.message ?? `HTTP ${res.status}`}` }
      return {
        ok: true,
        metrics: (data.data ?? []).map(m => ({ name: m.name ?? 'unknown', value: m.values?.[0]?.value ?? 0, period: 'latest' })),
      }
    } catch (e) {
      return { ok: false, reason: 'api_error', error: `Instagram: analytics failed: ${e instanceof Error ? e.message : String(e)}` }
    }
  },
}

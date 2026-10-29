/**
 * Brand profile discovery and persistence.
 * NEXUS asks 2–3 focused questions before planning when no profile exists;
 * answers are merged into a saved profile that drives personalization.
 */
import { getSupabaseClient } from './db/client.js'
import { parseModelJson } from './model/loader.js'
import type { AgentId } from '../shared/types.js'

export interface BrandProfile {
  userId: string
  status: 'discovering' | 'ready'
  /** What the user has today. */
  assets?: { brand?: string; socialAccounts?: string[]; audience?: string; website?: string; products?: string[]; content?: string[]; business?: string }
  /** What they want. */
  goals?: { objective?: string; targetAudience?: string; platforms?: string[]; timeframe?: string }
  /** What they can provide vs. want created. */
  resources?: { canProvide?: string[]; createFromScratch?: string[] }
  /** Free-form Q&A trail. */
  answers?: Record<string, string>
  voice?: string
  niche?: string
  updatedAt: string
}

export const DISCOVERY_QUESTIONS = [
  'What do you already have — an existing brand, social accounts, audience, website, products, or content? List anything relevant (or say "starting from zero").',
  'What do you want to achieve, who is your target audience, which platforms matter most to you, and what is your timeframe?',
  'What can you provide (photos, links, accounts, budget, time), and what do you want NexoraOS to create from scratch?',
]

interface ProfileRow {
  user_id: string
  profile: Partial<BrandProfile>
  status: 'discovering' | 'ready'
  updated_at: string
}

export async function getBrandProfile(userId: string): Promise<BrandProfile | null> {
  const { data } = await getSupabaseClient()
    .from('brand_profiles')
    .select('user_id, profile, status, updated_at')
    .eq('user_id', userId)
    .single()
  if (!data) return null
  const row = data as ProfileRow
  return {
    userId: row.user_id,
    status: row.status,
    updatedAt: row.updated_at,
    ...(row.profile as Partial<BrandProfile>),
  }
}

export async function saveBrandProfile(userId: string, profile: Partial<BrandProfile>, status: 'discovering' | 'ready'): Promise<void> {
  const { error } = await getSupabaseClient().from('brand_profiles').upsert({
    user_id: userId,
    profile,
    status,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(`Failed to save brand profile: ${error.message}`)
}

/** True when we know enough to build a non-generic plan. */
export function isProfileReady(profile: BrandProfile | null): profile is BrandProfile {
  return !!profile && profile.status === 'ready' && (!!profile.goals?.objective || !!profile.niche)
}

/** Extract structured profile fields from free-text answers. Model-assisted, best-effort. */
export async function extractProfileFromAnswers(
  answers: Record<string, string>,
  prior: Partial<BrandProfile>,
): Promise<Partial<BrandProfile>> {
  const merged: Partial<BrandProfile> = {
    ...prior,
    answers: { ...(prior.answers ?? {}), ...answers },
  }
  try {
    const { complete } = await import('./model/loader.js')
    const res = await complete({
      messages: [
        { role: 'system', content: 'Extract structured facts from the user answers. Respond with JSON only.' },
        { role: 'user', content: `User discovery answers: ${JSON.stringify(answers)}\n\nExtract JSON: {"niche":"...","voice":"...","assets":{"brand":"...","socialAccounts":["..."],"audience":"...","website":"...","products":["..."]},"goals":{"objective":"...","targetAudience":"...","platforms":["..."],"timeframe":"..."},"resources":{"canProvide":["..."],"createFromScratch":["..."]}}. Omit unknown fields.` },
      ],
      temperature: 0.2,
    })
    const parsed = parseModelJson<Partial<BrandProfile>>(res.content)
    if (parsed.ok) {
      const p = parsed.value
      merged.niche = p.niche ?? merged.niche
      merged.voice = p.voice ?? merged.voice
      merged.assets = { ...(merged.assets ?? {}), ...(p.assets ?? {}) }
      merged.goals = { ...(merged.goals ?? {}), ...(p.goals ?? {}) }
      merged.resources = { ...(merged.resources ?? {}), ...(p.resources ?? {}) }
    }
  } catch { /* heuristic fallback below keeps raw answers */ }
  return merged
}

export function summarizeProfile(profile: BrandProfile): string {
  return JSON.stringify({
    niche: profile.niche ?? null,
    voice: profile.voice ?? null,
    goals: profile.goals ?? null,
    assets: profile.assets ?? null,
    resources: profile.resources ?? null,
  })
}

export type { AgentId }

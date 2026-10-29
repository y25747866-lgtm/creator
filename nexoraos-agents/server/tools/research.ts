/**
 * NexoraOS Research Tool — used by SCOUT.
 * The web-search service is external; when unavailable this reports that
 * fact explicitly instead of silently falling back to model-only answers.
 */
import { complete } from '../model/loader.js'
import type { ToolResult } from '../../shared/types.js'

export interface ResearchResult {
  summary: string
  sources: Array<{ title: string; url: string; excerpt: string }>
  keyFindings: string[]
  searchAvailable: boolean
  warning?: string
}

interface WebSearchOutcome {
  text: string
  available: boolean
}

async function webSearch(query: string, signal?: AbortSignal): Promise<WebSearchOutcome> {
  try {
    const response = await fetch(`${(process.env.WEB_SEARCH_URL || 'http://localhost:3100').replace(/\/$/, '')}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 5 }),
      signal,
    })
    if (response.ok) {
      const data = await response.json() as { results?: Array<{ title: string; url: string; text: string }> }
      return {
        available: true,
        text: (data.results ?? []).map(r => `[${r.title}](${r.url})\n${r.text}`).join('\n\n'),
      }
    }
    return { available: false, text: '' }
  } catch {
    return { available: false, text: '' }
  }
}

const NO_SEARCH_WARNING =
  'Web search service unavailable — findings below come from the model alone and are NOT verified against live sources.'

export async function research(query: string, context: string, signal?: AbortSignal): Promise<ToolResult> {
  try {
    const search = await webSearch(query, signal)
    const result = await complete({
      messages: [
        {
          role: 'system',
          content: 'You are SCOUT, the NexoraOS Research Agent. You find ideas, validate markets, and collect real-time information. Be specific, factual, and concise. Format your response as JSON.',
        },
        {
          role: 'user',
          content: `Research this topic for a solo creator building a digital product business:

TOPIC: ${query}

CONTEXT: ${context}

${search.text ? `WEB SOURCES:\n${search.text}` : `No live web sources are available. ${NO_SEARCH_WARNING} Base your answer on general knowledge and clearly mark uncertain claims.`}

Respond with JSON in this exact shape:
{
  "summary": "2-3 sentence overview",
  "keyFindings": ["finding 1", "finding 2", "finding 3", "finding 4", "finding 5"],
  "sources": [{"title": "...", "url": "...", "excerpt": "..."}],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "risks": ["risk 1", "risk 2"]
}`,
        },
      ],
      temperature: 0.3,
      signal,
    })

    const parsed = JSON.parse(result.content) as Omit<ResearchResult, 'searchAvailable' | 'warning'>
    return {
      ok: true,
      data: {
        ...parsed,
        sources: search.available ? parsed.sources : [],
        searchAvailable: search.available,
        ...(search.available ? {} : { warning: NO_SEARCH_WARNING }),
      } satisfies ResearchResult,
    }
  } catch (error) {
    return { ok: false, error: `Research failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export async function competitorAnalysis(niche: string, signal?: AbortSignal): Promise<ToolResult> {
  try {
    const search = await webSearch(`${niche} competitors pricing digital products`, signal)
    const result = await complete({
      messages: [
        {
          role: 'system',
          content: 'You are SCOUT, the NexoraOS Research Agent. Analyze competitors and market positioning. Respond with JSON only.',
        },
        {
          role: 'user',
          content: `Analyze the competitive landscape for: ${niche}

${search.text ? `WEB SOURCES:\n${search.text}` : `No live web sources are available. ${NO_SEARCH_WARNING}`}

Respond with JSON:
{
  "topCompetitors": [{"name": "...", "price": "...", "weakness": "..."}],
  "marketGap": "where the opportunity is",
  "recommendedPrice": "suggested price range",
  "winningAngle": "how to position differently",
  "searchAvailable": ${search.available}
}`,
        },
      ],
      temperature: 0.3,
      signal,
    })
    const parsed = JSON.parse(result.content) as Record<string, unknown>
    return {
      ok: true,
      data: {
        ...parsed,
        searchAvailable: search.available,
        ...(search.available ? {} : { warning: NO_SEARCH_WARNING }),
      },
    }
  } catch (error) {
    return { ok: false, error: `Competitor analysis failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

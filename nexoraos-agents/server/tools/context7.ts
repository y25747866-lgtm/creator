/**
 * Context7 Tool — used by SCOUT
 * Fetches live, version-accurate documentation via Context7 MCP HTTP API
 * No API key required for basic usage (key removes rate limits)
 * Docs: https://context7.com
 */

import type { ToolResult } from '../../shared/types.js'

const CONTEXT7_BASE = 'https://mcp.context7.com/mcp'
const CONTEXT7_API_KEY = process.env.CONTEXT7_API_KEY ?? ''

interface Context7Response {
  content: Array<{ type: string; text: string }>
}

async function callContext7(method: string, params: Record<string, unknown>): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (CONTEXT7_API_KEY) headers['Authorization'] = `Bearer ${CONTEXT7_API_KEY}`

  const response = await fetch(CONTEXT7_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })

  if (!response.ok) throw new Error(`Context7 HTTP ${response.status}: ${response.statusText}`)

  const data = await response.json() as { result?: Context7Response; error?: { message: string } }
  if (data.error) throw new Error(`Context7 error: ${data.error.message}`)

  return data.result?.content?.map(c => c.text).join('\n') ?? ''
}

/**
 * Resolve a library name to a Context7-compatible library ID
 * Example: "react" → "/facebook/react"
 */
export async function resolveLibraryId(libraryName: string): Promise<ToolResult> {
  try {
    const result = await callContext7('tools/call', {
      name: 'resolve-library-id',
      arguments: { libraryName },
    })
    return { ok: true, data: { libraryId: result.trim() } }
  } catch (error) {
    return { ok: false, error: `resolveLibraryId failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/**
 * Fetch live documentation for a library
 * Example: queryDocs("/facebook/react", "hooks useState")
 */
export async function queryDocs(
  libraryId: string,
  query: string,
  tokens: number = 5000
): Promise<ToolResult> {
  try {
    const result = await callContext7('tools/call', {
      name: 'get-library-docs',
      arguments: { context7CompatibleLibraryID: libraryId, topic: query, tokens },
    })
    return { ok: true, data: { docs: result } }
  } catch (error) {
    return { ok: false, error: `queryDocs failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/**
 * Convenience: resolve + query in one call
 * SCOUT uses this when it needs live docs for a library
 */
export async function lookupDocs(libraryName: string, query: string): Promise<ToolResult> {
  const resolved = await resolveLibraryId(libraryName)
  if (!resolved.ok) return resolved
  const libraryId = (resolved.data as { libraryId: string }).libraryId
  return queryDocs(libraryId, query)
}

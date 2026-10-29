/**
 * NexoraOS Computer Tool — used by FLUX.
 * File access is confined to FLUX_WORKSPACE (symlink/hard-link/traversal rejected).
 * Browser control is delegated to an external local service; URLs are checked
 * against private/loopback address ranges before navigation (SSRF guard).
 * Shell execution is disabled until a real isolated runner exists.
 */
import { constants as fsConstants } from 'node:fs'
import { closeSync, fstatSync, ftruncateSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { assertPublicHttpUrl } from '../security/net.js'
import type { ToolResult } from '../../shared/types.js'

const WORKSPACE = resolve(process.env.FLUX_WORKSPACE || '/workspace/flux')
const BROWSER_CONTROL_URL = (process.env.BROWSER_CONTROL_URL || 'http://localhost:3200').replace(/\/$/, '')

function resolveWorkspaceFile(filename: string, createParent: boolean): string {
  if (!filename || filename.includes('\0') || isAbsolute(filename)) {
    throw new Error('A non-empty relative filename is required')
  }
  const pieces = filename.split(/[\\/]/)
  if (pieces.some((piece) => !piece || piece === '.' || piece === '..')) {
    throw new Error('Path traversal and empty path segments are not allowed')
  }

  mkdirSync(WORKSPACE, { recursive: true, mode: 0o700 })
  const workspaceRoot = realpathSync(WORKSPACE)
  let parent = workspaceRoot

  for (const piece of pieces.slice(0, -1)) {
    parent = join(parent, piece)
    try {
      const stats = lstatSync(parent)
      if (stats.isSymbolicLink() || !stats.isDirectory()) {
        throw new Error('Workspace path contains a non-directory or symbolic link')
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || !createParent) throw error
      mkdirSync(parent, { mode: 0o700 })
    }
    const canonicalParent = realpathSync(parent)
    const parentRel = relative(workspaceRoot, canonicalParent)
    if (parentRel === '..' || parentRel.startsWith(`..${sep}`) || isAbsolute(parentRel)) {
      throw new Error('Workspace path resolves outside FLUX_WORKSPACE')
    }
  }

  const target = resolve(parent, pieces.at(-1)!)
  const targetRel = relative(workspaceRoot, target)
  if (!targetRel || targetRel === '..' || targetRel.startsWith(`..${sep}`) || isAbsolute(targetRel)) {
    throw new Error('Path must resolve to a file inside FLUX_WORKSPACE')
  }
  try {
    if (lstatSync(target).isSymbolicLink()) throw new Error('Symbolic-link targets are not allowed')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  return target
}

/** Navigate the isolated browser-control service to an HTTP(S) public URL. */
export async function browserNavigate(url: string, signal?: AbortSignal): Promise<ToolResult> {
  try {
    const target = await assertPublicHttpUrl(url)
    const response = await fetch(`${BROWSER_CONTROL_URL}/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: target.toString() }),
      signal,
    })
    if (!response.ok) throw new Error(`Browser navigate failed: ${response.status}`)
    return { ok: true, data: await response.json() }
  } catch (error) {
    return { ok: false, error: `Browser navigate failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/** Take a screenshot of the current browser-control service state. */
export async function browserSnapshot(signal?: AbortSignal): Promise<ToolResult> {
  try {
    const response = await fetch(`${BROWSER_CONTROL_URL}/snapshot`, { method: 'POST', signal })
    if (!response.ok) throw new Error(`Snapshot failed: ${response.status}`)
    return { ok: true, data: await response.json() }
  } catch (error) {
    return { ok: false, error: `Snapshot failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/** Write a relative path beneath FLUX_WORKSPACE; symlink and hard-link escapes are rejected. */
export function writeFile(filename: string, content: string): ToolResult {
  let fd: number | undefined
  try {
    const path = resolveWorkspaceFile(filename, true)
    fd = openSync(path, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_NOFOLLOW, 0o600)
    const stats = fstatSync(fd)
    if (!stats.isFile() || stats.nlink !== 1) throw new Error('Only regular, single-link workspace files may be written')
    ftruncateSync(fd, 0)
    writeFileSync(fd, content, 'utf8')
    closeSync(fd)
    fd = undefined
    return { ok: true, data: { path, size: content.length } }
  } catch (error) {
    return { ok: false, error: `Write failed: ${error instanceof Error ? error.message : String(error)}` }
  } finally {
    if (fd !== undefined) closeSync(fd)
  }
}

/** Read a relative path beneath FLUX_WORKSPACE without following a final symlink. */
export function readFile(filename: string): ToolResult {
  let fd: number | undefined
  try {
    const path = resolveWorkspaceFile(filename, false)
    fd = openSync(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW)
    if (!fstatSync(fd).isFile()) throw new Error('Only regular workspace files may be read')
    const content = readFileSync(fd, 'utf8')
    closeSync(fd)
    fd = undefined
    return { ok: true, data: { content } }
  } catch (error) {
    return { ok: false, error: `Read failed: ${error instanceof Error ? error.message : String(error)}` }
  } finally {
    if (fd !== undefined) closeSync(fd)
  }
}

export function runShell(_command: string): ToolResult {
  return { ok: false, error: 'Shell execution is disabled: no isolated command runner is configured.' }
}

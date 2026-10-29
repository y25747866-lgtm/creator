import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { WorkflowEngine } from '../server/workflow/engine.js'
import { AGENT_REGISTRY, normalizeSpecialistAgents } from '../server/agents/registry.js'
import { mapAgentTaskRow } from '../server/db/mappers.js'

const workspace = mkdtempSync(join(tmpdir(), 'nexora-flux-test-'))
process.env.FLUX_WORKSPACE = workspace
const { runShell, writeFile, readFile } = await import('../server/tools/computer.js')

test('workflow engine imports the actual types module and resolves a menu node', () => {
  const engine = new WorkflowEngine((ref) => ref)
  const result = engine.resolve({
    entryNodeId: 'start',
    nodes: [{ id: 'start', type: 'menu', options: [{ label: 'Build', value: 'build' }] }],
    transitions: [],
  }, '', null, 'message-1')
  assert.ok(result)
  assert.equal(result.events[0]?.partType, 'menu')
  assert.equal(result.nextCursor, null)
})

test('FORGE is registered as the builder and can be selected by NEXUS routing normalization', () => {
  assert.equal(AGENT_REGISTRY.forge.role, 'builder')
  assert.deepEqual(normalizeSpecialistAgents(['forge', 'scout', 'unknown', 'forge']), ['forge', 'scout'])
})

test('agent_tasks snake_case row maps to the in-process task shape', () => {
  assert.deepEqual(mapAgentTaskRow({
    id: 'task-1', user_id: 'user-1', goal: 'Build a tool', agent: 'forge', status: 'queued',
    input: { goal: 'Build a tool', userId: 'user-1' }, parent_task_id: 'parent-1',
    created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  }), {
    id: 'task-1', userId: 'user-1', goal: 'Build a tool', agent: 'forge', status: 'queued',
    input: { goal: 'Build a tool', userId: 'user-1' }, output: undefined, parentTaskId: 'parent-1',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  })
})

test('shell execution is disabled and workspace writes reject traversal', () => {
  assert.equal(runShell('printf unsafe').ok, false)
  assert.equal(writeFile('../outside.txt', 'nope').ok, false)
  assert.equal(writeFile('nested/safe.txt', 'ok').ok, true)
})

test('workspace file operations reject symlinks without touching their targets', () => {
  const outside = join(tmpdir(), `nexora-outside-${process.pid}.txt`)
  writeFileSync(outside, 'untouched')
  symlinkSync(outside, join(workspace, 'external-link.txt'))
  assert.equal(writeFile('external-link.txt', 'modified').ok, false)
  assert.equal(readFile('external-link.txt').ok, false)
  assert.equal(readFileSync(outside, 'utf8'), 'untouched')
  rmSync(outside, { force: true })
})

test.after(() => rmSync(workspace, { recursive: true, force: true }))
import { createHmac } from 'node:crypto'
import { verifyWhatsAppSignature, verifyTelegramSecret } from '../server/security/webhooks.js'
import { isPrivateIp } from '../server/security/net.js'
import { parseModelJson } from '../server/model/loader.js'

test('WhatsApp HMAC: valid accepted, tampered/wrong/unsigned rejected', () => {
  const body = JSON.stringify({ entry: [] })
  const sig = 'sha256=' + createHmac('sha256', 's3cret').update(body).digest('hex')
  assert.equal(verifyWhatsAppSignature(body, sig, 's3cret'), true)
  assert.equal(verifyWhatsAppSignature(body + 'x', sig, 's3cret'), false)
  assert.equal(verifyWhatsAppSignature(body, sig, 'wrong'), false)
  assert.equal(verifyWhatsAppSignature(body, undefined, 's3cret'), false)
  assert.equal(verifyWhatsAppSignature(body, 'sha256=zz', 's3cret'), false)
})

test('Telegram secret token verified constant-time', () => {
  assert.equal(verifyTelegramSecret('tok', 'tok'), true)
  assert.equal(verifyTelegramSecret('tok', 'other'), false)
  assert.equal(verifyTelegramSecret(undefined, 'tok'), false)
})

test('private/loopback IPs blocked for browser navigation', () => {
  for (const ip of ['127.0.0.1', '10.0.0.5', '172.16.1.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '::1', '::', 'fe80::1', 'fd00::1'])
    assert.equal(isPrivateIp(ip), true, ip)
  for (const ip of ['8.8.8.8', '1.1.1.1', '203.0.113.10', '2001:db8::1', '93.184.216.34'])
    assert.equal(isPrivateIp(ip), false, ip)
})

test('parseModelJson tolerates fences and prose, rejects garbage', () => {
  assert.deepEqual(parseModelJson('```json\n{"a":1}\n```'), { ok: true, value: { a: 1 } })
  assert.deepEqual(parseModelJson('Sure! Here you go: {"a":1} — done.'), { ok: true, value: { a: 1 } })
  assert.equal(parseModelJson('not json at all').ok, false)
  assert.equal(parseModelJson('').ok, false)
  assert.equal(parseModelJson('   ').ok, false)
})


import { encryptCredentials, decryptCredentials } from '../server/platforms/credentials.js'

test('platform credentials are encrypted at rest and reject tampering/plaintext', () => {
  process.env.CREDENTIALS_ENCRYPTION_KEY = '11'.repeat(32)
  const source = { accessToken: 'private-token', pageId: '123' }
  const encrypted = encryptCredentials(source)
  assert.notEqual(JSON.stringify(encrypted).includes('private-token'), true)
  assert.deepEqual(decryptCredentials(encrypted), source)
  assert.throws(() => decryptCredentials({ accessToken: 'plaintext-token' }), /not encrypted/)
  assert.throws(() => decryptCredentials({ ...encrypted, data: 'AAAA' }), /authenticate|Unsupported state|bad decrypt/i)
  delete process.env.CREDENTIALS_ENCRYPTION_KEY
})

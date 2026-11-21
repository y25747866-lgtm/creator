import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const PREFIX = 'nexora:v1:'
function keyBytes(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY
  if (!raw) throw new Error('CREDENTIALS_ENCRYPTION_KEY is required to store or read platform credentials')
  let key: Buffer
  if (/^[a-fA-F0-9]{64}$/.test(raw)) key = Buffer.from(raw, 'hex')
  else key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('CREDENTIALS_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters or base64')
  return key
}

/** Encrypt secrets before they enter the database. Never log this value. */
export function encryptCredentials(credentials: Record<string, unknown>): Record<string, unknown> {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), 'utf8'), cipher.final()])
  return { _encrypted: PREFIX, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') }
}

/** Decrypt only values written in the versioned envelope; refuse plaintext rows by default. */
export function decryptCredentials(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid stored credentials')
  const envelope = value as Record<string, unknown>
  if (envelope._encrypted !== PREFIX || typeof envelope.iv !== 'string' || typeof envelope.tag !== 'string' || typeof envelope.data !== 'string') {
    throw new Error('Stored credentials are not encrypted with the current key. Reconnect this platform account to migrate credentials safely.')
  }
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(envelope.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8')
  const parsed: unknown = JSON.parse(plaintext)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Decrypted credentials have an invalid format')
  return parsed as Record<string, unknown>
}

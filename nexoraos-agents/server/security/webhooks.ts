/**
 * Webhook authenticity verification.
 * Pure functions — unit-testable without network access.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

/** Verify a Meta/WhatsApp X-Hub-Signature-256 header against the raw request body. */
export function verifyWhatsAppSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  if (!appSecret) return false
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const received = signatureHeader.slice('sha256='.length)
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(received, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Verify the Telegram webhook secret token. */
export function verifyTelegramSecret(
  header: string | undefined,
  expectedSecret: string,
): boolean {
  if (!expectedSecret) return false
  if (!header) return false
  const a = Buffer.from(header, 'utf8')
  const b = Buffer.from(expectedSecret, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Network guards — pure, unit-testable helpers.
 */
import { isIP } from 'node:net'

const PRIVATE_V4: Array<[number, number]> = [
  [0x0A000000, 0x0AFFFFFF],       // 10.0.0.0/8
  [0xAC100000, 0xAC1FFFFF],       // 172.16.0.0/12
  [0xC0A80000, 0xC0A8FFFF],       // 192.168.0.0/16
  [0x7F000000, 0x7FFFFFFF],       // 127.0.0.0/8
  [0xA9FE0000, 0xA9FEFFFF],       // 169.254.0.0/16 (link-local)
  [0x00000000, 0x00FFFFFF],       // 0.0.0.0/8 (incl. 0.0.0.0)
]

/** Returns true when an IPv4/IPv6 address string is loopback, private, link-local, or unspecified. */
export function isPrivateIp(ip: string): boolean {
  const v4 = isIP(ip) === 4
  if (v4) {
    const n = ip.split('.').reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0
    return PRIVATE_V4.some(([lo, hi]) => n >= lo && n <= hi)
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase()
    return (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('fe80') ||   // link-local
      lower.startsWith('fc') || lower.startsWith('fd') || // ULA
      lower.startsWith('::ffff:127.') // v4-mapped loopback handled by v4 range above rarely
    )
  }
  return false
}

/** Block URLs whose host is a literal private/loopback IP. DNS names are resolved and each A/AAAA record is checked. */
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  const target = new URL(rawUrl)
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are allowed')
  }
  if (target.username || target.password) throw new Error('URLs containing credentials are not allowed')
  const host = target.hostname.replace(/^[\[]|\]$/g, '')
  if (isIP(host) && isPrivateIp(host)) {
    throw new Error(`Refusing to reach private/loopback address: ${host}`)
  }
  if (!isIP(host)) {
    const { lookup } = await import('node:dns/promises')
    const records = await lookup(host, { all: true })
    for (const r of records) {
      if (isPrivateIp(r.address)) {
        throw new Error(`Refusing to reach private/loopback address: ${r.address} (${host})`)
      }
    }
  }
  return target
}

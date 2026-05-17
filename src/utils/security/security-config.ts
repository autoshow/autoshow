import type {
SourceUtilsSecuritySecurityConfigAddressFamily as AddressFamily,
SourceUtilsSecuritySecurityConfigParsedUrlCheck as ParsedUrlCheck,
SourceUtilsSecuritySecurityConfigPrivateAddressTools as PrivateAddressTools,
SourceUtilsSecuritySecurityConfigResolvedIpFamily as ResolvedIpFamily,
SourceUtilsSecuritySecurityConfigResolvedPublicHttpUrl as ResolvedPublicHttpUrl,
SourceUtilsSecuritySecurityConfigSecurityHeadersOptions as SecurityHeadersOptions,
SourceUtilsSecuritySecurityConfigUrlSafetyResult as UrlSafetyResult
} from '~/types'
import { l } from '../logger/logging'

const CSP_NONCE_BYTES = 16

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain'
])
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.localdomain', '.internal', '.home.arpa']

const IPV4_BLOCKED_SUBNETS: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4]
]

const IPV6_BLOCKED_SUBNETS: Array<[string, number]> = [
  ['::', 128],
  ['::1', 128],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8]
]

let privateAddressToolsPromise: Promise<PrivateAddressTools> | null = null
const NODE_NET_SPECIFIER = 'node:net'

const NONCE_SAFE_PATTERN = /[^A-Za-z0-9+/=]/g

const sanitizeNonceToken = (nonce: string): string => nonce.replace(NONCE_SAFE_PATTERN, '')

export const createCspNonce = (): string => {
  return sanitizeNonceToken(Buffer.from(crypto.getRandomValues(new Uint8Array(CSP_NONCE_BYTES))).toString('base64'))
}

const buildContentSecurityPolicy = ({
  nonce,
}: SecurityHeadersOptions = {}): string => {
  const scriptSources = ["'self'"]
  const styleSources = ["'self'"]
  const frameSources = ["'self'", 'https://accounts.google.com', 'https://docs.google.com']

  if (nonce) {
    const sanitizedNonce = sanitizeNonceToken(nonce)
    scriptSources.push(`'nonce-${sanitizedNonce}'`)
    styleSources.push(`'nonce-${sanitizedNonce}'`)
  } else {
    scriptSources.push("'unsafe-inline'")
    styleSources.push("'unsafe-inline'")
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSources.join(' ')} https://accounts.google.com https://apis.google.com`,
    `style-src ${styleSources.join(' ')}`,
    "img-src 'self' data: https:",
    "font-src 'self' data: https:",
    `frame-src ${frameSources.join(' ')}`,
    "connect-src 'self' https: wss:",
    "media-src 'self' blob: data: https:",
  ].join('; ')
}

export const buildSecurityHeaders = (options: SecurityHeadersOptions = {}): Record<string, string> => ({
  'Content-Security-Policy': buildContentSecurityPolicy(options),
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)'
})

export const SECURITY_HEADERS = buildSecurityHeaders()


function checkUrlStructure(raw: string): ParsedUrlCheck {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, reason: 'Invalid URL' }
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, reason: 'Only HTTP(S) URLs are allowed' }
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URLs with embedded credentials are not allowed' }
  }

  return { ok: true, parsed }
}

const normalizeHostname = (hostname: string): string => hostname.trim().replace(/\.$/, '').toLowerCase()

const isBlockedHostname = (hostname: string): boolean => {
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return true
  }

  return BLOCKED_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix))
}

const getMappedIpv4Address = (address: string): string | null => {
  const normalizedAddress = address.toLowerCase()
  if (!normalizedAddress.startsWith('::ffff:')) {
    return null
  }

  return normalizedAddress.slice('::ffff:'.length)
}

const getPrivateAddressTools = (): Promise<PrivateAddressTools> => {
  if (!privateAddressToolsPromise) {
    privateAddressToolsPromise = (async () => {
      const { BlockList, isIP } = await import(/* @vite-ignore */ NODE_NET_SPECIFIER)
      const privateAddressBlocklist = new BlockList()

      for (const [subnet, prefix] of IPV4_BLOCKED_SUBNETS) {
        privateAddressBlocklist.addSubnet(subnet, prefix, 'ipv4')
      }

      for (const [subnet, prefix] of IPV6_BLOCKED_SUBNETS) {
        privateAddressBlocklist.addSubnet(subnet, prefix, 'ipv6')
      }

      return {
        isIP,
        isBlocked: (address: string, family: AddressFamily) => privateAddressBlocklist.check(address, family)
      }
    })()
  }

  return privateAddressToolsPromise
}

const isBlockedIpAddress = (address: string, tools: PrivateAddressTools): boolean => {
  const mappedIpv4 = getMappedIpv4Address(address)
  if (mappedIpv4) {
    return tools.isIP(mappedIpv4) === 4 && tools.isBlocked(mappedIpv4, 'ipv4')
  }

  const family = tools.isIP(address)
  if (family === 4) {
    return tools.isBlocked(address, 'ipv4')
  }

  if (family === 6) {
    return tools.isBlocked(address, 'ipv6')
  }

  return true
}

const getResolvedPort = (parsedUrl: URL): number => {
  if (parsedUrl.port) {
    return parseInt(parsedUrl.port, 10)
  }

  return parsedUrl.protocol === 'https:' ? 443 : 80
}

const buildResolvedPublicHttpUrl = (
  parsedUrl: URL,
  hostname: string,
  address: string,
  family: ResolvedIpFamily
): ResolvedPublicHttpUrl => ({
  url: parsedUrl.toString(),
  hostname,
  port: getResolvedPort(parsedUrl),
  address,
  family
})

export const validatePublicHttpUrl = async (rawUrl: string): Promise<UrlSafetyResult> => {
  const t0 = performance.now()

  const check = checkUrlStructure(rawUrl)
  if (!check.ok) {
    return { safe: false, error: check.reason }
  }

  const { parsed: parsedUrl } = check

  const hostname = normalizeHostname(parsedUrl.hostname)
  if (!hostname) {
    return { safe: false, error: 'Invalid URL host' }
  }

  if (isBlockedHostname(hostname)) {
    return { safe: false, error: 'URL host is not allowed' }
  }

  const t1 = performance.now()
  const tools = await getPrivateAddressTools()
  const t2 = performance.now()

  if (tools.isIP(hostname) > 0) {
    if (isBlockedIpAddress(hostname, tools)) {
      return { safe: false, error: 'URL resolves to a blocked address' }
    }
    const family = tools.isIP(hostname) === 6 ? 6 : 4
    return {
      safe: true,
      url: parsedUrl.toString(),
      resolved: buildResolvedPublicHttpUrl(parsedUrl, hostname, hostname, family),
      diagnostics: { dnsLookup_ms: 0, recordCount: 1, primaryAddress: hostname }
    }
  }

  const t3 = performance.now()
  let records: Array<{ address: string }>
  try {
    records = await Bun.dns.lookup(hostname, { family: 4, backend: 'getaddrinfo' })
  } catch {
    l('[validate-url] DNS lookup failed', {
      hostname,
      structureCheck_ms: Math.round(t1 - t0),
      privateAddressTools_ms: Math.round(t2 - t1),
      dnsLookup_ms: Math.round(performance.now() - t3),
      total_ms: Math.round(performance.now() - t0),
    })
    return { safe: false, error: 'Could not resolve URL host' }
  }
  const t4 = performance.now()

  if (!records.length) {
    return { safe: false, error: 'Could not resolve URL host' }
  }

  for (const record of records) {
    if (isBlockedIpAddress(record.address, tools)) {
      return { safe: false, error: 'URL resolves to a blocked address' }
    }
  }

  const primaryAddress = records[0]!.address
  const family = tools.isIP(primaryAddress) === 6 ? 6 : 4

  return {
    safe: true,
    url: parsedUrl.toString(),
    resolved: buildResolvedPublicHttpUrl(parsedUrl, hostname, primaryAddress, family),
    diagnostics: { dnsLookup_ms: Math.round(t4 - t3), recordCount: records.length, primaryAddress }
  }
}

export const requirePublicHttpUrl = async (
  rawUrl: string,
  contextLabel: string = 'URL'
): Promise<string> => {
  const result = await validatePublicHttpUrl(rawUrl)
  if (!result.safe) {
    throw new Error(`${contextLabel}: ${result.error}`)
  }

  return result.url
}

export const requireResolvedPublicHttpUrl = async (
  rawUrl: string,
  contextLabel: string = 'URL'
): Promise<ResolvedPublicHttpUrl> => {
  const result = await validatePublicHttpUrl(rawUrl)
  if (!result.safe) {
    throw new Error(`${contextLabel}: ${result.error}`)
  }

  return result.resolved
}

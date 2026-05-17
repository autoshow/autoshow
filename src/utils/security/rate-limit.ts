import { getDatabase } from '~/database/db'
import type { RateLimitConfigName,RateLimitResult,SecurityEvent } from '~/types'
import { l } from '~/utils/logger/logging'
import { sendSecurityAlert } from './security-alerts'

const TRUST_PROXY_FLAG = 'AUTOSHOW_TRUST_PROXY_HEADERS'
const TRUSTED_PROXY_TOKEN_ENV = 'AUTOSHOW_TRUSTED_PROXY_TOKEN'
const TRUSTED_PROXY_TOKEN_HEADER = 'x-autoshow-trusted-proxy-token'

const RATE_LIMIT_CONFIG: Record<RateLimitConfigName, { maxRequests: number; windowMs: number; blockMs: number }> = {
  uploadSimpleIp: { maxRequests: 30, windowMs: 60_000, blockMs: 300_000 },
  uploadChunkIp: { maxRequests: 360, windowMs: 60_000, blockMs: 120_000 },
  verifyUrlIp: { maxRequests: 20, windowMs: 60_000, blockMs: 120_000 },
}

export function getRateLimitKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`
}

export function getRateLimitClientIp(headers: Headers): string | null {
  const trustProxyHeaders = process.env[TRUST_PROXY_FLAG] === '1'
  if (!trustProxyHeaders) return null

  const expectedToken = process.env[TRUSTED_PROXY_TOKEN_ENV]?.trim()
  if (!expectedToken) return null

  const suppliedToken = headers.get(TRUSTED_PROXY_TOKEN_HEADER)?.trim()
  if (suppliedToken !== expectedToken) return null

  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0]?.trim()
    if (ip) return ip
  }

  return headers.get('x-real-ip')?.trim() || null
}

export async function checkRateLimit(
  key: string,
  configName: RateLimitConfigName
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIG[configName]
  const now = new Date()
  const db = getDatabase()

  const rows = await db`
    SELECT count, reset_at, blocked_until
    FROM rate_limit
    WHERE key = ${key}
  `

  const row = rows[0] as { count: number; reset_at: string; blocked_until: string | null } | undefined
  const resetAtDate = row ? new Date(row.reset_at) : null
  const blockedUntilDate = row?.blocked_until ? new Date(row.blocked_until) : null

  if (!row || !resetAtDate || now > resetAtDate) {
    const resetAt = new Date(now.getTime() + config.windowMs)
    await db`
      INSERT INTO rate_limit (id, key, count, reset_at)
      VALUES (${crypto.randomUUID()}, ${key}, ${1}, ${resetAt.toISOString()})
      ON CONFLICT (key) DO UPDATE SET count = 1, reset_at = EXCLUDED.reset_at, blocked_until = NULL
    `
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: resetAt.getTime() }
  }

  if (blockedUntilDate && now < blockedUntilDate) {
    const retryAfter = Math.ceil((blockedUntilDate.getTime() - now.getTime()) / 1000)
    logSecurityEvent({
      eventType: 'security:rate-limit-blocked',
      severity: 'high',
      details: { key, configName, retryAfter },
    })
    return { allowed: false, remaining: 0, resetAt: blockedUntilDate.getTime(), retryAfter }
  }

  if (row.count >= config.maxRequests) {
    const blockedUntil = new Date(now.getTime() + config.blockMs)
    await db`
      UPDATE rate_limit SET blocked_until = ${blockedUntil.toISOString()} WHERE key = ${key}
    `
    const retryAfter = Math.ceil(config.blockMs / 1000)
    logSecurityEvent({
      eventType: 'security:rate-limit-blocked',
      severity: 'high',
      details: { key, configName, retryAfter },
    })
    return { allowed: false, remaining: 0, resetAt: resetAtDate.getTime(), retryAfter }
  }

  await db`
    UPDATE rate_limit SET count = count + 1 WHERE key = ${key}
  `
  return {
    allowed: true,
    remaining: config.maxRequests - (row.count + 1),
    resetAt: resetAtDate.getTime(),
  }
}

export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  }

  l(`[SECURITY] ${event.eventType}`, {
    timestamp: fullEvent.timestamp,
    severity: fullEvent.severity,
    ip: fullEvent.ip,
    ...(fullEvent.details ? { details: fullEvent.details } : {}),
  })

  if (fullEvent.severity === 'high' || fullEvent.severity === 'critical') {
    const dedupeScope = fullEvent.ip
      ?? (typeof fullEvent.details?.key === 'string' ? fullEvent.details.key : undefined)
      ?? (typeof fullEvent.details?.route === 'string' ? fullEvent.details.route : undefined)
      ?? 'global'

    void sendSecurityAlert({
      eventType: fullEvent.eventType,
      severity: fullEvent.severity,
      dedupeKey: `${fullEvent.eventType}:${dedupeScope}`,
      ...(fullEvent.ip ? { ip: fullEvent.ip } : {}),
      ...(fullEvent.userAgent ? { userAgent: fullEvent.userAgent } : {}),
      ...(fullEvent.details ? { details: fullEvent.details } : {}),
    })
  }
}

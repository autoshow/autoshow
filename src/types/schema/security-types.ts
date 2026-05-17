import * as v from 'valibot'

const SecurityEventSeveritySchema = v.picklist(['low', 'medium', 'high', 'critical'])

export const SecurityEventTypeSchema = v.picklist([
  'security:url-blocked',
  'security:rate-limit-blocked',
])

export const SecurityEventSchema = v.object({
  timestamp: v.string(),
  eventType: SecurityEventTypeSchema,
  severity: v.optional(SecurityEventSeveritySchema),
  ip: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  details: v.optional(v.record(
    v.pipe(v.string(), v.nonEmpty()),
    v.union([v.string(), v.number(), v.boolean(), v.null()])
  )),
})

export const RateLimitResultSchema = v.object({
  allowed: v.boolean(),
  remaining: v.number(),
  resetAt: v.number(),
  retryAfter: v.optional(v.number()),
})

export const RateLimitConfigNameSchema = v.picklist([
  'uploadSimpleIp',
  'uploadChunkIp',
  'verifyUrlIp',
])

export const EmailResultSchema = v.object({
  success: v.boolean(),
  error: v.optional(v.string()),
  messageId: v.optional(v.string()),
})

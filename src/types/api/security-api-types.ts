import type * as v from 'valibot'
import type { RateLimitConfigNameSchema,RateLimitResultSchema,SecurityEventSchema } from '../schema/security-types'

export type RateLimitConfigName = v.InferOutput<typeof RateLimitConfigNameSchema>
export type RateLimitResult = v.InferOutput<typeof RateLimitResultSchema>
export type SecurityEvent = v.InferOutput<typeof SecurityEventSchema>

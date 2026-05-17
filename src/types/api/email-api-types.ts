import type * as v from 'valibot'
import type { EmailResultSchema } from '../schema/security-types'

export type EmailResult = v.InferOutput<typeof EmailResultSchema>

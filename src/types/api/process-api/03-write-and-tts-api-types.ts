import type * as v from 'valibot'
import type { WriteAndTtsMetadataSchema,WriteModeSchema } from '../../schema/process-types'

export type WriteMode = v.InferOutput<typeof WriteModeSchema>
export type WriteAndTtsMetadata = v.InferOutput<typeof WriteAndTtsMetadataSchema>

export type LLMAttempt = {
  provider: import('../process-api-types').StructuredOutputProvider
  model: string
}

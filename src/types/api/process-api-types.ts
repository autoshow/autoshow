import type * as v from 'valibot'
import type { ProgressStatusSchema } from '../schema/progress-types'
import type {
ClaudeDocumentModelSchema,
DeapiOCRModelSchema,
GeminiDocumentModelSchema,
GlmOCRModelSchema,
GrokDocumentModelSchema,
MistralOCRModelSchema,
OpenAIDocumentModelSchema
} from '../schema/step-2-document-types'

export type ProgressStatus = v.InferOutput<typeof ProgressStatusSchema>
export type MistralOCRModel = v.InferOutput<typeof MistralOCRModelSchema>
export type GlmOCRModel = v.InferOutput<typeof GlmOCRModelSchema>
export type OpenAIDocumentModel = v.InferOutput<typeof OpenAIDocumentModelSchema>
export type ClaudeDocumentModel = v.InferOutput<typeof ClaudeDocumentModelSchema>
export type GeminiDocumentModel = v.InferOutput<typeof GeminiDocumentModelSchema>
export type GrokDocumentModel = v.InferOutput<typeof GrokDocumentModelSchema>
export type DeapiOCRModel = v.InferOutput<typeof DeapiOCRModelSchema>

export type StructuredOutputProvider = 'openai' | 'claude' | 'gemini' | 'minimax' | 'deepinfra' | 'grok' | 'groq' | 'glm'

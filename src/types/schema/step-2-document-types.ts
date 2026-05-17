import * as v from 'valibot'
import { ModelEstimationSchema } from './estimation-types'
import { SpeedProfileSchema } from './speed-types'

export const SupportedDocumentTypeSchema = v.union([
  v.literal('pdf'),
  v.literal('png'),
  v.literal('jpg'),
  v.literal('tiff'),
  v.literal('txt'),
  v.literal('docx'),
  v.literal('pptx'),
  v.literal('xlsx')
])

export const DocumentExtractionServiceTypeSchema = v.union([
  v.literal('mistral-ocr'),
  v.literal('glm'),
  v.literal('openai'),
  v.literal('claude'),
  v.literal('gemini'),
  v.literal('grok'),
  v.literal('deapi')
])

export const MistralOCRModelSchema = v.union([
  v.literal('mistral-ocr-latest')
])

export const GlmOCRModelSchema = v.union([
  v.literal('glm-ocr')
])

export const OpenAIDocumentModelSchema = v.union([
  v.literal('gpt-5.4-pro'),
  v.literal('gpt-5.4'),
  v.literal('gpt-5.4-mini'),
  v.literal('gpt-5.4-nano')
])

export const ClaudeDocumentModelSchema = v.union([
  v.literal('claude-opus-4-6'),
  v.literal('claude-sonnet-4-6'),
  v.literal('claude-haiku-4-5-20251001')
])

export const GeminiDocumentModelSchema = v.union([
  v.literal('gemini-3.1-pro-preview'),
  v.literal('gemini-3.1-flash-lite-preview')
])

export const GrokDocumentModelSchema = v.union([
  v.literal('grok-4.20-0309-non-reasoning')
])

export const DeapiOCRModelSchema = v.union([
  v.literal('Nanonets_Ocr_S_F16')
])

export const DocumentExtractionModelUnionSchema = v.union([
  MistralOCRModelSchema,
  GlmOCRModelSchema,
  OpenAIDocumentModelSchema,
  ClaudeDocumentModelSchema,
  GeminiDocumentModelSchema,
  GrokDocumentModelSchema,
  DeapiOCRModelSchema
])

export const Step2DocumentMetadataSchema = v.object({
  extractionService: DocumentExtractionServiceTypeSchema,
  extractionModel: DocumentExtractionModelUnionSchema,
  processingTime: v.pipe(v.number(), v.minValue(0)),
  pageCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  characterCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  inputTokenCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  outputTokenCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  totalCost: v.optional(v.pipe(v.number(), v.minValue(0))),
  actualCostUsd: v.optional(v.pipe(v.number(), v.minValue(0))),
  preprocessedFromType: v.optional(SupportedDocumentTypeSchema)
})

export const DocumentBackupMetadataSchema = v.object({
  bucketUrl: v.pipe(v.string(), v.nonEmpty()),
  objectKey: v.pipe(v.string(), v.nonEmpty()),
  uploadedAt: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const DocumentRuntimeCapabilitiesSchema = v.object({
  canConvertTiffToPng: v.boolean()
})

export const documentExtractionServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  description: v.string(),
  supportedTypes: v.pipe(v.array(SupportedDocumentTypeSchema), v.minLength(1)),
  nativeTypes: v.pipe(v.array(SupportedDocumentTypeSchema), v.minLength(1)),
  preprocessableTypes: v.array(SupportedDocumentTypeSchema),
  models: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string(),
    estimation: ModelEstimationSchema,
    speedProfile: SpeedProfileSchema,
    quality: v.optional(v.string()),
    costPerPage: v.optional(v.pipe(v.number(), v.minValue(0)))
  })), v.minLength(1))
})

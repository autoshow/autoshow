import * as v from 'valibot'
import type { ServicesConfig } from './services-types'

export const SupportedDocumentTypeSchema = v.union([
  v.literal('pdf'),
  v.literal('png'),
  v.literal('jpg'),
  v.literal('tiff'),
  v.literal('txt'),
  v.literal('docx')
])

export const DocumentExtractionServiceTypeSchema = v.union([
  v.literal('llamaparse'),
  v.literal('mistral-ocr')
])

export const LlamaParseModelSchema = v.union([
  v.literal('fast'),
  v.literal('cost_effective'),
  v.literal('agentic'),
  v.literal('agentic_plus')
])

export const MistralOCRModelSchema = v.union([
  v.literal('mistral-ocr-latest')
])

export const DocumentExtractionModelUnionSchema = v.union([
  LlamaParseModelSchema,
  MistralOCRModelSchema
])

export const Step2DocumentMetadataSchema = v.object({
  extractionService: DocumentExtractionServiceTypeSchema,
  extractionModel: DocumentExtractionModelUnionSchema,
  processingTime: v.pipe(v.number(), v.minValue(0)),
  pageCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  characterCount: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const DocumentBackupMetadataSchema = v.object({
  bucketUrl: v.pipe(v.string(), v.nonEmpty()),
  objectKey: v.pipe(v.string(), v.nonEmpty()),
  uploadedAt: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const DocumentBackupResultSchema = v.object({
  objectKey: v.pipe(v.string(), v.nonEmpty()),
  bucketUrl: v.pipe(v.string(), v.nonEmpty()),
  size: v.pipe(v.number(), v.integer(), v.minValue(0)),
  contentType: v.string()
})

export const documentExtractionServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  description: v.string(),
  supportedTypes: v.pipe(v.array(SupportedDocumentTypeSchema), v.minLength(1)),
  models: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string()
  })), v.minLength(1))
})

export type SupportedDocumentType = v.InferOutput<typeof SupportedDocumentTypeSchema>
export type DocumentExtractionServiceType = v.InferOutput<typeof DocumentExtractionServiceTypeSchema>
export type LlamaParseModel = v.InferOutput<typeof LlamaParseModelSchema>
export type MistralOCRModel = v.InferOutput<typeof MistralOCRModelSchema>
export type DocumentExtractionModel = v.InferOutput<typeof DocumentExtractionModelUnionSchema>
export type Step2DocumentMetadata = v.InferOutput<typeof Step2DocumentMetadataSchema>
export type DocumentBackupMetadata = v.InferOutput<typeof DocumentBackupMetadataSchema>
export type DocumentBackupResult = v.InferOutput<typeof DocumentBackupResultSchema>

export type LlamaParseResult = {
  id: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  error_message?: string
  result?: {
    markdown?: {
      pages?: Array<{ markdown: string }>
    }
  }
}

export type MistralOCRResponse = {
  pages: Array<{
    index: number
    markdown: string
    images?: Array<{ id: string; top_left_x: number; top_left_y: number; bottom_right_x: number; bottom_right_y: number; image_base64?: string }>
    tables?: Array<{ id: string; content: string }>
    hyperlinks?: Array<{ url: string; text?: string }>
    header: string | null
    footer: string | null
    dimensions?: { dpi?: number; height?: number; width?: number }
  }>
  model: string
  document_annotation: string | null
  usage_info: { pages_processed: number; doc_size_bytes: number | null }
}

export type LlamaParseExtractionResult = {
  markdown: string
  pageCount: number
  metadata: Step2DocumentMetadata
}

export type MistralOCRExtractionResult = {
  markdown: string
  pageCount: number
  metadata: Step2DocumentMetadata
}

export type DocumentConfig = ServicesConfig['documentExtraction']

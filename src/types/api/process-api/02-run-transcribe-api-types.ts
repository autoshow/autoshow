import type * as v from 'valibot'
import type {
AssemblyTranscriptResponseSchema,
AssemblyTranscriptWordSchema,
DeapiCreateResponseSchema,
DeapiResultSchema,
DeepgramResponseSchema,
DeepgramWordSchema,
GladiaTranscriptionInitResponseSchema,
GladiaTranscriptionStatusResponseSchema,
GladiaUploadResponseSchema,
GladiaUtteranceSchema,
HappyScribeSegmentSchema,
HappyScribeWordSchema,
SonioxTokenSchema,
SonioxTranscriptResponseSchema,
SonioxTranscriptionStatusResponseSchema,
Step2MetadataSchema,
SupadataChunkSchema,
SupadataJobResponseSchema,
SupadataJobStatusResponseSchema,
SupadataTranscriptResponseSchema,
TranscriptionSegmentSchema,
VerboseTranscriptionSchema
} from '../../schema/step-2-transcription-types'

export type TranscriptionSegment = v.InferOutput<typeof TranscriptionSegmentSchema>
export type Step2Metadata = v.InferOutput<typeof Step2MetadataSchema>
export type HappyScribeWord = v.InferOutput<typeof HappyScribeWordSchema>
export type HappyScribeSegment = v.InferOutput<typeof HappyScribeSegmentSchema>
export type GladiaUploadResponse = v.InferOutput<typeof GladiaUploadResponseSchema>
export type GladiaTranscriptionInitResponse = v.InferOutput<typeof GladiaTranscriptionInitResponseSchema>
export type GladiaUtterance = v.InferOutput<typeof GladiaUtteranceSchema>
export type GladiaTranscriptionStatusResponse = v.InferOutput<typeof GladiaTranscriptionStatusResponseSchema>
export type VerboseTranscription = v.InferOutput<typeof VerboseTranscriptionSchema>
export type AssemblyTranscriptWord = v.InferOutput<typeof AssemblyTranscriptWordSchema>
export type AssemblyTranscriptResponse = v.InferOutput<typeof AssemblyTranscriptResponseSchema>
export type DeepgramWord = v.InferOutput<typeof DeepgramWordSchema>
export type DeepgramResponse = v.InferOutput<typeof DeepgramResponseSchema>
export type SonioxToken = v.InferOutput<typeof SonioxTokenSchema>
export type SonioxTranscriptResponse = v.InferOutput<typeof SonioxTranscriptResponseSchema>
export type SonioxTranscriptionStatusResponse = v.InferOutput<typeof SonioxTranscriptionStatusResponseSchema>
export type DeapiCreateResponse = v.InferOutput<typeof DeapiCreateResponseSchema>
export type DeapiResult = v.InferOutput<typeof DeapiResultSchema>
export type SupadataChunk = v.InferOutput<typeof SupadataChunkSchema>
export type SupadataTranscriptResponse = v.InferOutput<typeof SupadataTranscriptResponseSchema>
export type SupadataJobResponse = v.InferOutput<typeof SupadataJobResponseSchema>
export type SupadataJobStatusResponse = v.InferOutput<typeof SupadataJobStatusResponseSchema>

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

export type DocumentExtractionResult = {
  markdown: string
  pageCount: number
  metadata: import('../../backend/backend-types').Step2DocumentMetadata
}

export type MistralOCRExtractionResult = DocumentExtractionResult
export type GlmOCRExtractionResult = DocumentExtractionResult
export type GrokDocumentExtractionResult = DocumentExtractionResult
export type DeapiOCRExtractionResult = DocumentExtractionResult

export type GladiaTranscriptionOptions = {
  audioUrl: string
  enableDiarization?: boolean
  detectLanguage?: boolean
  language?: string
}

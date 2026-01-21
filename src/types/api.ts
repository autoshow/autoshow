import * as v from 'valibot'
import { LLMServiceTypeSchema } from './services'

export const ProcessingFormDataSchema = v.object({
  url: v.optional(v.string()),
  transcriptionOption: v.pipe(v.string(), v.nonEmpty()),
  transcriptionModel: v.optional(v.string()),
  llmService: v.optional(LLMServiceTypeSchema, 'openai'),
  llmModel: v.pipe(v.string(), v.nonEmpty()),
  uploadedFilePath: v.optional(v.string()),
  uploadedFileName: v.optional(v.string()),
  selectedPrompts: v.pipe(v.string(), v.nonEmpty()),
  urlType: v.optional(v.string()),
  urlDuration: v.optional(v.string()),
  urlFileSize: v.optional(v.string()),
  ttsEnabled: v.optional(v.string()),
  ttsService: v.optional(v.string()),
  ttsVoice: v.optional(v.string()),
  imageGenEnabled: v.optional(v.string()),
  selectedImagePrompts: v.optional(v.string()),
  musicGenSkipped: v.optional(v.string()),
  selectedMusicGenre: v.optional(v.string()),
  videoGenEnabled: v.optional(v.string()),
  selectedVideoPrompts: v.optional(v.string()),
  videoModel: v.optional(v.string()),
  videoSize: v.optional(v.string()),
  videoDuration: v.optional(v.string())
})

export type ProcessingFormData = v.InferOutput<typeof ProcessingFormDataSchema>

export const VerifyUrlRequestSchema = v.object({
  url: v.pipe(v.string(), v.nonEmpty())
})

export type VerifyUrlRequest = v.InferOutput<typeof VerifyUrlRequestSchema>

export const UploadChunkInputSchema = v.object({
  chunkIndex: v.pipe(v.number(), v.integer(), v.minValue(0)),
  totalChunks: v.pipe(v.number(), v.integer(), v.minValue(1)),
  fileId: v.pipe(v.string(), v.nonEmpty()),
  fileName: v.pipe(v.string(), v.nonEmpty())
})

export type UploadChunkInput = v.InferOutput<typeof UploadChunkInputSchema>

export const JobIdParamSchema = v.pipe(v.string(), v.nonEmpty())

export const HappyScribeLinkSchema = v.object({
  href: v.optional(v.string())
})

export const HappyScribeTranscriptionResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  state: v.string(),
  name: v.optional(v.string()),
  failureMessage: v.optional(v.string()),
  _links: v.optional(v.object({
    self: v.optional(HappyScribeLinkSchema)
  }))
})

export type HappyScribeTranscriptionResponse = v.InferOutput<typeof HappyScribeTranscriptionResponseSchema>

export const HappyScribeExportResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  state: v.string(),
  download_link: v.optional(v.string()),
  _links: v.optional(v.object({
    self: v.optional(HappyScribeLinkSchema)
  }))
})

export type HappyScribeExportResponse = v.InferOutput<typeof HappyScribeExportResponseSchema>

export const TranscriptionServiceSchema = v.union([v.literal('groq'), v.literal('deepinfra'), v.literal('happyscribe')])
export const UrlTypeInputSchema = v.union([v.literal('youtube'), v.literal('streaming'), v.literal('direct-file')])
export const TTSServiceSchema = v.union([v.literal('openai'), v.literal('elevenlabs')])

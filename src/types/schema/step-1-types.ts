import * as v from 'valibot'
import { SupportedDocumentTypeSchema } from './step-2-document-types'

export const UrlTypeSchema = v.union([
  v.literal('youtube'),
  v.literal('streaming'),
  v.literal('direct-file'),
  v.literal('document'),
  v.literal('invalid')
])

export const YouTubeCaptionSourceSchema = v.union([
  v.literal('manual'),
  v.literal('automatic')
])

export const YouTubeCaptionMetadataSchema = v.object({
  available: v.boolean(),
  source: v.optional(YouTubeCaptionSourceSchema, undefined),
  language: v.optional(v.string(), undefined),
  languageName: v.optional(v.string(), undefined)
})

export const UrlMetadataSchema = v.object({
  urlType: UrlTypeSchema,
  title: v.optional(v.string(), undefined),
  author: v.optional(v.string(), undefined),
  publishDate: v.optional(v.string(), undefined),
  publishDateFormatted: v.optional(v.string(), undefined),
  thumbnail: v.optional(v.string(), undefined),
  channelUrl: v.optional(v.string(), undefined),
  duration: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  fileSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), undefined),
  fileSizeFormatted: v.optional(v.string(), undefined),
  durationFormatted: v.optional(v.string(), undefined),
  mimeType: v.optional(v.string(), undefined),
  error: v.optional(v.string(), undefined),
  youtubeCaptions: v.optional(YouTubeCaptionMetadataSchema, undefined),
  documentType: v.optional(SupportedDocumentTypeSchema, undefined)
})

export const VideoMetadataSchema = v.object({
  title: v.pipe(v.string(), v.nonEmpty()),
  duration: v.string(),
  author: v.string(),
  description: v.string(),
  url: v.pipe(v.string(), v.nonEmpty(), v.url()),
  publishDate: v.optional(v.string(), undefined),
  thumbnail: v.optional(v.string(), undefined),
  channelUrl: v.optional(v.string(), undefined)
})

export const Step1MetadataSchema = v.object({
  videoUrl: v.pipe(v.string(), v.nonEmpty()),
  videoTitle: v.pipe(v.string(), v.nonEmpty()),
  videoPublishDate: v.optional(v.string(), undefined),
  videoThumbnail: v.optional(v.string(), undefined),
  channelTitle: v.string(),
  channelUrl: v.optional(v.string(), undefined),
  duration: v.string(),
  audioFileName: v.pipe(v.string(), v.nonEmpty()),
  audioFileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  audioS3Url: v.optional(v.string(), undefined)
})

export const DocumentMetadataSchema = v.object({
  title: v.pipe(v.string(), v.nonEmpty()),
  pageCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  fileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  source: v.union([v.literal('local'), v.literal('url')]),
  documentType: SupportedDocumentTypeSchema
})

export const Step1DocumentMetadataSchema = v.object({
  documentUrl: v.pipe(v.string(), v.nonEmpty()),
  documentTitle: v.pipe(v.string(), v.nonEmpty()),
  documentType: SupportedDocumentTypeSchema,
  documentFileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  pageCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)))
})

export const Step1CombinedMetadataSchema = v.union([Step1MetadataSchema, Step1DocumentMetadataSchema])

export const InputTypeSchema = v.union([
  v.literal('audio-video'),
  v.literal('document')
])

export const ConvertToAudioResultSchema = v.object({
  wavPath: v.pipe(v.string(), v.nonEmpty()),
  mp3Path: v.pipe(v.string(), v.nonEmpty()),
  duration: v.optional(v.pipe(v.number(), v.minValue(0))),
  wavS3Url: v.optional(v.string(), undefined),
  mp3S3Url: v.optional(v.string(), undefined)
})

export const VerifyUrlRequestSchema = v.object({
  url: v.pipe(v.string(), v.nonEmpty())
})

const MAX_UPLOAD_TOTAL_CHUNKS = 256
const MAX_UPLOAD_FILE_ID_LENGTH = 128
const MAX_UPLOAD_FILE_NAME_LENGTH = 255

export const UploadChunkInputSchema = v.object({
  chunkIndex: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(MAX_UPLOAD_TOTAL_CHUNKS - 1)),
  totalChunks: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(MAX_UPLOAD_TOTAL_CHUNKS)),
  fileId: v.pipe(v.string(), v.nonEmpty(), v.maxLength(MAX_UPLOAD_FILE_ID_LENGTH)),
  fileName: v.pipe(v.string(), v.nonEmpty(), v.maxLength(MAX_UPLOAD_FILE_NAME_LENGTH))
})

export const CommandResultSchema = v.object({
  stdout: v.string(),
  stderr: v.string(),
  exitCode: v.number()
})

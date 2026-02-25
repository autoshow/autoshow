import * as v from 'valibot'
import { SupportedDocumentTypeSchema } from './step-2-document-types'

export const UrlTypeSchema = v.union([
  v.literal('youtube'),
  v.literal('streaming'),
  v.literal('direct-file'),
  v.literal('document'),
  v.literal('invalid')
])

export const UrlMetadataSchema = v.object({
  urlType: UrlTypeSchema,
  duration: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  fileSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), undefined),
  fileSizeFormatted: v.optional(v.string(), undefined),
  durationFormatted: v.optional(v.string(), undefined),
  mimeType: v.optional(v.string(), undefined),
  error: v.optional(v.string(), undefined),
  documentType: v.optional(SupportedDocumentTypeSchema, undefined)
})

export const DurationResultSchema = v.object({
  duration: v.pipe(v.number(), v.minValue(0)),
  formatted: v.string(),
  method: v.union([v.literal('hls'), v.literal('ffprobe_http'), v.literal('full'), v.literal('skipped')]),
  requiresFullDownload: v.boolean()
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

export const YouTubeApiVideoInfoSchema = v.object({
  id: v.optional(v.string(), undefined),
  snippet: v.optional(v.object({
    publishedAt: v.optional(v.string(), undefined),
    channelId: v.optional(v.string(), undefined),
    title: v.optional(v.string(), undefined),
    description: v.optional(v.string(), undefined),
    thumbnails: v.optional(v.any(), undefined),
    channelTitle: v.optional(v.string(), undefined)
  }), undefined),
  contentDetails: v.optional(v.object({
    duration: v.optional(v.string(), undefined)
  }), undefined)
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

export const DownloadOptionsSchema = v.object({
  url: v.pipe(v.string(), v.nonEmpty()),
  outputPath: v.pipe(v.string(), v.nonEmpty()),
  maxConnections: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  maxSplit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  retryWait: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)))
})

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

export const UrlTypeInputSchema = v.union([v.literal('youtube'), v.literal('streaming'), v.literal('direct-file'), v.literal('document')])

export type UrlType = v.InferOutput<typeof UrlTypeSchema>
export type UrlMetadata = v.InferOutput<typeof UrlMetadataSchema>
export type DurationResult = v.InferOutput<typeof DurationResultSchema>
export type VideoMetadata = v.InferOutput<typeof VideoMetadataSchema>
export type Step1Metadata = v.InferOutput<typeof Step1MetadataSchema>
export type YouTubeApiVideoInfo = v.InferOutput<typeof YouTubeApiVideoInfoSchema>
export type DocumentMetadata = v.InferOutput<typeof DocumentMetadataSchema>
export type Step1DocumentMetadata = v.InferOutput<typeof Step1DocumentMetadataSchema>
export type Step1CombinedMetadata = v.InferOutput<typeof Step1CombinedMetadataSchema>
export type InputType = v.InferOutput<typeof InputTypeSchema>
export type DownloadOptions = v.InferOutput<typeof DownloadOptionsSchema>
export type ConvertToAudioResult = v.InferOutput<typeof ConvertToAudioResultSchema>
export type VerifyUrlRequest = v.InferOutput<typeof VerifyUrlRequestSchema>

export const UploadChunkInputSchema = v.object({
  chunkIndex: v.pipe(v.number(), v.integer(), v.minValue(0)),
  totalChunks: v.pipe(v.number(), v.integer(), v.minValue(1)),
  fileId: v.pipe(v.string(), v.nonEmpty()),
  fileName: v.pipe(v.string(), v.nonEmpty())
})

export type UploadChunkInput = v.InferOutput<typeof UploadChunkInputSchema>

export const CommandResultSchema = v.object({
  stdout: v.string(),
  stderr: v.string(),
  exitCode: v.number()
})

export type CommandResult = v.InferOutput<typeof CommandResultSchema>

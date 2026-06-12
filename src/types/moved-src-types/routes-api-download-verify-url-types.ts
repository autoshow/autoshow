import type { SupportedDocumentType,YouTubeCaptionMetadata } from '~/types'

export type SourceRoutesApiDownloadVerifyUrlMetadataDiagnostics = {
  source?: string
  ytdlp_ms?: number
  stdout_bytes?: number
  captionTrack?: { source: string, language: string, ext: string } | null
}

export type SourceRoutesApiDownloadVerifyUrlVerifiedUrlMetadata = {
  title?: string
  author?: string
  publishDate?: string
  publishDateFormatted?: string
  thumbnail?: string
  channelUrl?: string
  duration?: number
  fileSize?: number
  mimeType?: string
  documentType?: SupportedDocumentType
  youtubeCaptions?: YouTubeCaptionMetadata
  error?: string
  diagnostics?: SourceRoutesApiDownloadVerifyUrlMetadataDiagnostics
}

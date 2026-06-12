import type { YouTubeCaptionTrack } from '~/routes/api/process/01-dl-audio/video/youtube-captions'

export type SourceRoutesApiProcess01DlAudioVideoYoutubeVideoInfoResolvedYouTubeSnippet = {
  publishedAt: string | undefined
  channelId: string | undefined
  title: string | undefined
  description: string | undefined
  thumbnails: Record<string, { url: string }> | undefined
  channelTitle: string | undefined
}

export type SourceRoutesApiProcess01DlAudioVideoYoutubeVideoInfoDiagnostics = {
  ytdlp_ms: number
  stdout_bytes: number
  captionTrack?: { source: string, language: string, ext: string } | null
}

export type SourceRoutesApiProcess01DlAudioVideoYoutubeVideoInfoResolvedYouTubeVideoInfo = {
  videoId: string
  durationSeconds: number
  snippet: SourceRoutesApiProcess01DlAudioVideoYoutubeVideoInfoResolvedYouTubeSnippet
  channelUrl: string | undefined
  source: 'youtube-data-api' | 'yt-dlp'
  captionsChecked: boolean
  captionTrack?: YouTubeCaptionTrack | undefined
  diagnostics?: SourceRoutesApiProcess01DlAudioVideoYoutubeVideoInfoDiagnostics
}

export type SourceRoutesApiProcess01DlAudioVideoYoutubeVideoInfoCacheEntry = {
  expiresAt: number
  value: SourceRoutesApiProcess01DlAudioVideoYoutubeVideoInfoResolvedYouTubeVideoInfo | null
}

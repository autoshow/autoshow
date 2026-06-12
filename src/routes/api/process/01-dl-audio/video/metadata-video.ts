import type { SourceRoutesApiDownloadVerifyUrlVerifiedUrlMetadata as VerifiedUrlMetadata } from '~/types'
import { warn } from '~/utils/logger/logging'
import { requirePublicHttpUrl } from '~/utils/security/security-config'
import { normalizeYtDlpPublishDate } from '~/utils/source-publish-date'
import { executeCommand } from '../dl-utils'
import { toYouTubeCaptionMetadata } from './youtube-captions'
import { resolveYouTubeVideoInfo } from './youtube-video-info'

const getBestThumbnailUrl = (thumbnails: unknown): string | undefined => {
  if (!thumbnails || typeof thumbnails !== 'object') {
    return undefined
  }

  const record = thumbnails as Record<string, { url?: unknown }>
  for (const quality of ['maxres', 'standard', 'high', 'medium', 'default']) {
    const thumbnail = record[quality]
    if (thumbnail && typeof thumbnail.url === 'string' && thumbnail.url.length > 0) {
      return thumbnail.url
    }
  }

  for (const thumbnail of Object.values(record)) {
    if (thumbnail && typeof thumbnail.url === 'string' && thumbnail.url.length > 0) {
      return thumbnail.url
    }
  }

  return undefined
}

const getYtDlpBestThumbnailUrl = (data: Record<string, unknown>): string | undefined => {
  if (typeof data.thumbnail === 'string' && data.thumbnail.length > 0) {
    return data.thumbnail
  }

  if (!Array.isArray(data.thumbnails)) {
    return undefined
  }

  return data.thumbnails
    .map(entry => {
      if (!entry || typeof entry !== 'object') return null
      const record = entry as Record<string, unknown>
      const url = typeof record.url === 'string' ? record.url : undefined
      const width = typeof record.width === 'number' ? record.width : 0
      const height = typeof record.height === 'number' ? record.height : 0
      return url ? { url, score: width * height } : null
    })
    .filter((entry): entry is { url: string, score: number } => !!entry)
    .sort((a, b) => b.score - a.score)[0]?.url
}

const parsePositiveNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return undefined
}

export const getYouTubeMetadata = async (url: string): Promise<VerifiedUrlMetadata> => {
  const videoInfo = await resolveYouTubeVideoInfo(url, { includeCaptions: true })

  if (!videoInfo) {
    warn('[youtube-metadata] video info resolution returned null', { url })
    return {}
  }

  if (!videoInfo.captionsChecked) {
    warn('[youtube-metadata] captions were not checked (yt-dlp likely failed)', { url, source: videoInfo.source })
  }

  const thumbnail = getBestThumbnailUrl(videoInfo.snippet.thumbnails)

  return {
    ...(videoInfo.durationSeconds ? { duration: videoInfo.durationSeconds } : {}),
    ...(videoInfo.snippet.title ? { title: videoInfo.snippet.title } : {}),
    ...(videoInfo.snippet.channelTitle ? { author: videoInfo.snippet.channelTitle } : {}),
    ...(videoInfo.snippet.publishedAt ? { publishDate: videoInfo.snippet.publishedAt } : {}),
    ...(thumbnail ? { thumbnail } : {}),
    ...(videoInfo.channelUrl ? { channelUrl: videoInfo.channelUrl } : {}),
    ...(videoInfo.captionsChecked ? { youtubeCaptions: toYouTubeCaptionMetadata(videoInfo.captionTrack) } : {}),
    diagnostics: { source: videoInfo.source, ...videoInfo.diagnostics }
  }
}

export const getNonYouTubeStreamingMetadata = async (url: string): Promise<VerifiedUrlMetadata> => {
  try {
    const safeUrl = await requirePublicHttpUrl(url, 'Streaming URL')
    
    const result = await executeCommand('yt-dlp', [
      '--dump-json',
      '--no-playlist',
      '--quiet',
      safeUrl
    ])
    
    if (result.exitCode !== 0) {
      return {}
    }
    
    const data = JSON.parse(result.stdout) as Record<string, unknown>
    
    const duration = parsePositiveNumber(data.duration)
    const fileSizeValue = parsePositiveNumber(data.filesize) ?? parsePositiveNumber(data.filesize_approx)
    const fileSize = fileSizeValue === undefined ? undefined : Math.floor(fileSizeValue)
    const author = typeof data.channel === 'string'
      ? data.channel
      : typeof data.uploader === 'string'
      ? data.uploader
      : undefined
    const channelUrl = typeof data.channel_url === 'string'
      ? data.channel_url
      : typeof data.uploader_url === 'string'
      ? data.uploader_url
      : undefined
    const publishDate = normalizeYtDlpPublishDate(data)
    const thumbnail = getYtDlpBestThumbnailUrl(data)
    return {
      ...(duration !== undefined && { duration }),
      ...(fileSize !== undefined && { fileSize }),
      ...(typeof data.title === 'string' && data.title.length > 0 ? { title: data.title } : {}),
      ...(author ? { author } : {}),
      ...(publishDate ? { publishDate } : {}),
      ...(thumbnail ? { thumbnail } : {}),
      ...(channelUrl ? { channelUrl } : {})
    }
  } catch (error) {
    return {}
  }
}

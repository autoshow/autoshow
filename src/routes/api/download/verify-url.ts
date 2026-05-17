import { json } from "@solidjs/router"
import type { APIEvent } from "@solidjs/start/server"
import * as v from 'valibot'
import { getDocumentMetadata } from '~/routes/api/process/01-dl-audio/document/metadata-document'
import { getDirectFileMetadata } from '~/routes/api/process/01-dl-audio/file/metadata-file'
import { getNonYouTubeStreamingMetadata,getYouTubeMetadata } from '~/routes/api/process/01-dl-audio/video/metadata-video'
import type { SourceRoutesApiDownloadVerifyUrlVerifiedUrlMetadata as VerifiedUrlMetadata } from '~/types'
import { VerifyUrlRequestSchema,validationErrorResponse,type UrlMetadata,type UrlType } from '~/types'
import { err,l } from "~/utils/logger/logging"
import { detectRemoteSourceType } from '~/utils/remote-source-url'
import { checkRateLimit,getRateLimitClientIp,getRateLimitKey } from '~/utils/security/rate-limit'
import { validatePublicHttpUrl } from '~/utils/security/security-config'
import { formatSourcePublishDate } from '~/utils/source-publish-date'

const formatDurationHuman = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const INVALID_URL_ERROR = 'Invalid URL or unsupported format'
const YOUTUBE_DURATION_ERROR = 'Could not determine YouTube video duration. Please try again.'

const detectUrlType = (url: string): UrlType => {
  return detectRemoteSourceType(url)
}

const loadVerifiedUrlMetadata = async (
  urlType: Exclude<UrlType, 'invalid'>,
  url: string
): Promise<VerifiedUrlMetadata> => {
  switch (urlType) {
    case 'direct-file':
      return await getDirectFileMetadata(url)
    case 'youtube':
      return await getYouTubeMetadata(url)
    case 'streaming':
      return await getNonYouTubeStreamingMetadata(url)
    case 'document':
      return await getDocumentMetadata(url)
  }
}

const buildFormattedMetadata = (
  urlType: Exclude<UrlType, 'invalid'>,
  metadata: VerifiedUrlMetadata
): UrlMetadata => {
  const sharedMetadata = {
    ...(metadata.title !== undefined && { title: metadata.title }),
    ...(metadata.author !== undefined && { author: metadata.author }),
    ...(metadata.publishDate !== undefined && {
      publishDate: metadata.publishDate,
      publishDateFormatted: formatSourcePublishDate(metadata.publishDate)
    }),
    ...(metadata.thumbnail !== undefined && { thumbnail: metadata.thumbnail }),
    ...(metadata.channelUrl !== undefined && { channelUrl: metadata.channelUrl }),
    ...(metadata.fileSize !== undefined && {
      fileSize: metadata.fileSize,
      fileSizeFormatted: formatFileSize(metadata.fileSize)
    }),
    ...(metadata.mimeType !== undefined && { mimeType: metadata.mimeType }),
    ...(metadata.youtubeCaptions !== undefined && { youtubeCaptions: metadata.youtubeCaptions }),
    ...(metadata.documentType !== undefined && { documentType: metadata.documentType })
  }

  return metadata.error
    ? {
        urlType,
        error: metadata.error,
        ...sharedMetadata
      }
    : {
        urlType,
        ...(metadata.duration !== undefined && {
          duration: metadata.duration,
          durationFormatted: formatDurationHuman(metadata.duration)
        }),
        ...sharedMetadata
      }
}

const verifyUrl = async (url: string): Promise<{ result: UrlMetadata, diagnostics?: VerifiedUrlMetadata['diagnostics'] }> => {
  const urlType = detectUrlType(url)

  if (urlType === 'invalid') {
    return { result: { urlType, error: INVALID_URL_ERROR } }
  }

  const metadata = await loadVerifiedUrlMetadata(urlType, url)

  if (urlType === 'youtube' && metadata.duration === undefined && !metadata.error) {
    metadata.error = YOUTUBE_DURATION_ERROR
  }

  return { result: buildFormattedMetadata(urlType, metadata), diagnostics: metadata.diagnostics }
}

export async function POST({ request }: APIEvent) {
  try {
    const t0 = performance.now()

    const t1 = performance.now()

    const clientIp = getRateLimitClientIp(request.headers)
    if (clientIp) {
      const rateLimit = await checkRateLimit(getRateLimitKey('verifyUrl', clientIp), 'verifyUrlIp')
      if (!rateLimit.allowed) {
        return json({ error: 'Too many verification requests. Please try again later.' }, { status: 429 })
      }
    }

    const t2 = performance.now()

    const body = await request.json()

    const bodyResult = v.safeParse(VerifyUrlRequestSchema, body)
    if (!bodyResult.success) {
      return validationErrorResponse(bodyResult.issues)
    }

    const { url } = bodyResult.output
    const urlSafety = await validatePublicHttpUrl(url)
    if (!urlSafety.safe) {
      return json({
        urlType: 'invalid',
        error: urlSafety.error,
      }, { status: 400 })
    }

    const t3 = performance.now()

    const { result: metadata, diagnostics: metadataDiagnostics } = await verifyUrl(urlSafety.url)

    const t4 = performance.now()
    l('[verify-url]', {
      url: urlSafety.url,
      urlType: metadata.urlType,
      requestStart_ms: Math.round(t1 - t0),
      rateLimit_ms: Math.round(t2 - t1),
      urlValidation_ms: Math.round(t3 - t2),
      metadata_ms: Math.round(t4 - t3),
      total_ms: Math.round(t4 - t0),
      ...( urlSafety.diagnostics ? {
        dns: urlSafety.diagnostics
      } : {}),
      ...(metadataDiagnostics ? {
        metadata: metadataDiagnostics
      } : {}),
    })

    return metadata.error
      ? json(metadata, { status: 200 })
      : json(metadata)
  } catch (error) {
    err("Failed to verify URL", error)
    return json(
      { error: "Failed to verify URL" },
      { status: 500 }
    )
  }
}

import type { SourceRoutesApiProcess01DlAudioVideoYoutubeVideoInfoCacheEntry as CacheEntry,SourceRoutesApiProcess01DlAudioVideoYoutubeVideoInfoResolvedYouTubeVideoInfo as ResolvedYouTubeVideoInfo } from '~/types'
import { err,l,warn } from '~/utils/logger/logging'
import { normalizeYtDlpPublishDate } from '~/utils/source-publish-date'
import { executeCommand,extractYouTubeId } from '../dl-utils'
import { selectYouTubeCaptionTrack } from './youtube-captions'

type ResolveYouTubeVideoInfoOptions = {
  includeCaptions?: boolean
  forceRefresh?: boolean
}

const parseISO8601Duration = (duration: string): number => {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
  const matches = duration.match(regex)

  if (!matches) {
    return 0
  }

  const hours = parseInt(matches[1] || '0')
  const minutes = parseInt(matches[2] || '0')
  const seconds = parseInt(matches[3] || '0')

  return hours * 3600 + minutes * 60 + seconds
}

const YOUTUBE_API_KEY = process.env['YOUTUBE_API_KEY']
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/videos'
const YOUTUBE_SUCCESS_TTL_MS = 30 * 60 * 1000
const YOUTUBE_FAILURE_TTL_MS = 60 * 1000
const YOUTUBE_DATA_API_TIMEOUT_MS = 1200
const YOUTUBE_FALLBACK_START_DELAY_MS = 700
const YOUTUBE_YT_DLP_BASIC_TIMEOUT_MS = 5000
const YOUTUBE_YT_DLP_CAPTIONS_TIMEOUT_MS = 20000

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<ResolvedYouTubeVideoInfo | null>>()

const getCachedValue = (videoId: string): ResolvedYouTubeVideoInfo | null | undefined => {
  const entry = cache.get(videoId)
  if (!entry) return undefined
  if (entry.expiresAt > Date.now()) {
    return entry.value
  }
  cache.delete(videoId)
  return undefined
}

const setCachedValue = (videoId: string, value: ResolvedYouTubeVideoInfo | null): ResolvedYouTubeVideoInfo | null => {
  cache.set(videoId, {
    value,
    expiresAt: Date.now() + (value ? YOUTUBE_SUCCESS_TTL_MS : YOUTUBE_FAILURE_TTL_MS)
  })
  return value
}

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(value), ms)
  })
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<unknown | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) {
        return null
      }

      return await response.json()
    } finally {
      clearTimeout(timeoutId)
    }
  } catch {
    return null
  }
}

const getBestYtDlpThumbnail = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  if (!Array.isArray(value)) {
    return undefined
  }

  const thumbnails = value
    .map(entry => {
      if (!entry || typeof entry !== 'object') return null
      const record = entry as Record<string, unknown>
      const url = typeof record.url === 'string' ? record.url : undefined
      const width = typeof record.width === 'number' ? record.width : 0
      const height = typeof record.height === 'number' ? record.height : 0
      return url ? { url, score: width * height } : null
    })
    .filter((entry): entry is { url: string, score: number } => !!entry)
    .sort((a, b) => b.score - a.score)

  return thumbnails[0]?.url
}

const parseYtDlpDuration = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return undefined
}

const fetchFromYouTubeDataApi = async (videoId: string): Promise<ResolvedYouTubeVideoInfo | null> => {
  if (!YOUTUBE_API_KEY) {
    return null
  }

  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: videoId,
    key: YOUTUBE_API_KEY,
    fields: 'items(id,snippet(publishedAt,channelId,title,description,thumbnails,channelTitle),contentDetails(duration))'
  })
  const data = await fetchJsonWithTimeout(`${YOUTUBE_API_BASE}?${params.toString()}`, YOUTUBE_DATA_API_TIMEOUT_MS)

  if (!data || typeof data !== 'object') {
    return null
  }

  const items = (data as { items?: unknown }).items
  if (!Array.isArray(items) || items.length === 0) {
    return null
  }

  const item = items[0]
  if (!item || typeof item !== 'object') {
    return null
  }

  const record = item as Record<string, unknown>
  const snippetRecord = record.snippet && typeof record.snippet === 'object'
    ? record.snippet as Record<string, unknown>
    : undefined
  const contentDetails = record.contentDetails && typeof record.contentDetails === 'object'
    ? record.contentDetails as Record<string, unknown>
    : undefined
  const durationIso = typeof contentDetails?.duration === 'string' ? contentDetails.duration : undefined
  const durationSeconds = durationIso ? parseISO8601Duration(durationIso) : undefined

  if (!durationSeconds || durationSeconds <= 0) {
    return null
  }

  const channelId = typeof snippetRecord?.channelId === 'string' ? snippetRecord.channelId : undefined

  return {
    videoId,
    durationSeconds,
    source: 'youtube-data-api',
    snippet: {
      publishedAt: typeof snippetRecord?.publishedAt === 'string' ? snippetRecord.publishedAt : undefined,
      channelId,
      title: typeof snippetRecord?.title === 'string' ? snippetRecord.title : undefined,
      description: typeof snippetRecord?.description === 'string' ? snippetRecord.description : undefined,
      thumbnails: snippetRecord?.thumbnails && typeof snippetRecord.thumbnails === 'object'
        ? snippetRecord.thumbnails as Record<string, { url: string }>
        : undefined,
      channelTitle: typeof snippetRecord?.channelTitle === 'string' ? snippetRecord.channelTitle : undefined
    },
    channelUrl: channelId ? `https://www.youtube.com/channel/${channelId}` : undefined,
    captionsChecked: false
  }
}

const fetchFromYtDlp = async (
  url: string,
  videoId: string,
  options: ResolveYouTubeVideoInfoOptions = {}
): Promise<ResolvedYouTubeVideoInfo | null> => {
  try {
    const timeoutMs = options.includeCaptions
      ? YOUTUBE_YT_DLP_CAPTIONS_TIMEOUT_MS
      : YOUTUBE_YT_DLP_BASIC_TIMEOUT_MS
    const t0 = performance.now()
    const result = await executeCommand('yt-dlp', [
      '--dump-single-json',
      '--skip-download',
      '--no-playlist',
      '--no-warnings',
      '--quiet',
      url
    ], timeoutMs)
    const t1 = performance.now()

    if (result.exitCode !== 0) {
      warn('[yt-dlp] non-zero exit code', { videoId, exitCode: result.exitCode, stderr: result.stderr.slice(0, 500) })
      return null
    }

    const data = JSON.parse(result.stdout) as Record<string, unknown>
    const durationSeconds = parseYtDlpDuration(data.duration)

    if (!durationSeconds) {
      return null
    }

    const channelId = typeof data.channel_id === 'string' ? data.channel_id : undefined
    const bestThumbnail = getBestYtDlpThumbnail(data.thumbnail) || getBestYtDlpThumbnail(data.thumbnails)
    const captionTrack = options.includeCaptions
      ? selectYouTubeCaptionTrack({
          subtitles: data.subtitles,
          automatic_captions: data.automatic_captions
        })
      : null

    return {
      videoId,
      durationSeconds,
      source: 'yt-dlp',
      snippet: {
        publishedAt: normalizeYtDlpPublishDate(data),
        channelId,
        title: typeof data.title === 'string' ? data.title : undefined,
        description: typeof data.description === 'string' ? data.description : undefined,
        channelTitle: typeof data.channel === 'string'
          ? data.channel
          : typeof data.uploader === 'string'
          ? data.uploader
          : undefined,
        thumbnails: bestThumbnail ? { high: { url: bestThumbnail } } : undefined
      },
      channelUrl: typeof data.channel_url === 'string'
        ? data.channel_url
        : channelId
        ? `https://www.youtube.com/channel/${channelId}`
        : undefined,
      captionsChecked: !!options.includeCaptions,
      ...(captionTrack ? { captionTrack } : {}),
      diagnostics: {
        ytdlp_ms: Math.round(t1 - t0),
        stdout_bytes: result.stdout.length,
        ...(options.includeCaptions ? {
          captionTrack: captionTrack
            ? { source: captionTrack.source, language: captionTrack.language, ext: captionTrack.ext }
            : null
        } : {})
      }
    }
  } catch (error) {
    err('[yt-dlp] fetch failed', error, { videoId })
    return null
  }
}

function toAnySuccess<T>(promise: Promise<T | null>): Promise<T> {
  return promise.then(value => {
    if (value) {
      return value
    }

    throw new Error('No result')
  })
}

const resolveYouTubeVideoInfoUncached = async (
  url: string,
  videoId: string,
  options: ResolveYouTubeVideoInfoOptions = {}
): Promise<ResolvedYouTubeVideoInfo | null> => {
  if (options.includeCaptions) {
    const ytDlpResult = await fetchFromYtDlp(url, videoId, options)
    if (ytDlpResult) {
      return ytDlpResult
    }
    warn('[youtube-video-info] yt-dlp failed for caption request, falling back to data API (captions will be unavailable)', { videoId })
    return await fetchFromYouTubeDataApi(videoId)
  }

  const dataApiPromise = fetchFromYouTubeDataApi(videoId)
  const earlyApiResult = await Promise.race([
    dataApiPromise,
    delay(YOUTUBE_FALLBACK_START_DELAY_MS, 'fallback' as const)
  ])

  if (earlyApiResult && earlyApiResult !== 'fallback') {
    return earlyApiResult
  }

  if (earlyApiResult === null) {
    return await fetchFromYtDlp(url, videoId, options)
  }

  const fallbackPromise = fetchFromYtDlp(url, videoId, options)

  try {
    return await Promise.any([
      toAnySuccess(dataApiPromise),
      toAnySuccess(fallbackPromise)
    ])
  } catch {
    const [apiResult, fallbackResult] = await Promise.all([dataApiPromise, fallbackPromise])
    return apiResult ?? fallbackResult ?? null
  }
}

const canUseCachedValue = (
  value: ResolvedYouTubeVideoInfo | null,
  options: ResolveYouTubeVideoInfoOptions
): boolean => {
  if (!value) return true
  return !options.includeCaptions || value.captionsChecked
}

const getInflightKey = (videoId: string, options: ResolveYouTubeVideoInfoOptions): string => {
  return `${videoId}:${options.includeCaptions ? 'captions' : 'basic'}`
}

export const resolveYouTubeVideoInfo = async (
  url: string,
  options: ResolveYouTubeVideoInfoOptions = {}
): Promise<ResolvedYouTubeVideoInfo | null> => {
  const videoId = extractYouTubeId(url)
  if (!videoId) {
    return null
  }

  const cached = options.forceRefresh ? undefined : getCachedValue(videoId)
  if (cached !== undefined && canUseCachedValue(cached, options)) {
    l('[youtube-video-info] cache hit', { videoId, source: cached?.source ?? null })
    return cached
  }

  const inflightKey = getInflightKey(videoId, options)
  const existing = options.forceRefresh ? undefined : inflight.get(inflightKey)
  if (existing) {
    l('[youtube-video-info] joining inflight request', { videoId, inflightKey })
    return await existing
  }

  const promise = (async () => {
    const resolved = await resolveYouTubeVideoInfoUncached(url, videoId, options)
    return setCachedValue(videoId, resolved)
  })()

  inflight.set(inflightKey, promise)

  try {
    return await promise
  } finally {
    if (inflight.get(inflightKey) === promise) {
      inflight.delete(inflightKey)
    }
  }
}

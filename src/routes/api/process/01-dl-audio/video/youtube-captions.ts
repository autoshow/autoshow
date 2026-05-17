import type { YouTubeCaptionMetadata } from '~/types'

export type YouTubeCaptionSource = 'manual' | 'automatic'

export type YouTubeCaptionTrack = {
  source: YouTubeCaptionSource
  language: string
  languageName?: string
  ext: 'json3' | 'vtt'
  url?: string
}

type CaptionEntry = {
  language: string
  tracks: YouTubeCaptionTrack[]
}

const SUPPORTED_CAPTION_EXTENSIONS = new Set(['json3', 'vtt'])

const getString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

const normalizeCaptionExt = (value: unknown): YouTubeCaptionTrack['ext'] | undefined => {
  const ext = getString(value)?.toLowerCase()
  return ext && SUPPORTED_CAPTION_EXTENSIONS.has(ext)
    ? ext as YouTubeCaptionTrack['ext']
    : undefined
}

const hasSearchParam = (url: string, param: string): boolean => {
  try {
    return new URL(url).searchParams.has(param)
  } catch {
    return new RegExp(`[?&]${param}=`, 'i').test(url)
  }
}

const isAutomaticTranslationTrack = (source: YouTubeCaptionSource, url: string | undefined): boolean => {
  return source === 'automatic' && !!url && hasSearchParam(url, 'tlang')
}

const getLanguageName = (
  track: Record<string, unknown>,
  language: string
): string | undefined => {
  const name = getString(track.name)
    ?? getString(track.language)
    ?? getString(track.lang)

  return name && name.toLowerCase() !== language.toLowerCase() ? name : undefined
}

const toCaptionTrack = (
  source: YouTubeCaptionSource,
  language: string,
  value: unknown
): YouTubeCaptionTrack | null => {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  const ext = normalizeCaptionExt(record.ext)
  if (!ext) return null
  const languageName = getLanguageName(record, language)
  const url = getString(record.url)
  if (isAutomaticTranslationTrack(source, url)) return null

  return {
    source,
    language,
    ext,
    ...(languageName ? { languageName } : {}),
    ...(url ? { url } : {})
  }
}

const getCaptionEntries = (
  value: unknown,
  source: YouTubeCaptionSource
): CaptionEntry[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([language, tracksValue]) => {
      if (!Array.isArray(tracksValue)) return null

      const tracks = tracksValue
        .map(track => toCaptionTrack(source, language, track))
        .filter((track): track is YouTubeCaptionTrack => !!track)

      return tracks.length > 0 ? { language, tracks } : null
    })
    .filter((entry): entry is CaptionEntry => !!entry)
}

const choosePreferredTrack = (entry: CaptionEntry): YouTubeCaptionTrack => {
  return entry.tracks.find(track => track.ext === 'json3')
    ?? entry.tracks.find(track => track.ext === 'vtt')
    ?? entry.tracks[0]!
}

export const isEnglishCaptionLanguage = (language: string | undefined): boolean => {
  if (!language) return false
  return /^en(?:[-_]|$)/i.test(language)
}

const getEnglishCaptionLanguageRank = (language: string): number => {
  const normalized = language.toLowerCase().replaceAll('_', '-')

  if (normalized === 'en-orig') return 0
  if (normalized === 'en') return 1
  if (isEnglishCaptionLanguage(normalized)) return 2
  return Number.POSITIVE_INFINITY
}

const findEnglishTrack = (entries: CaptionEntry[]): YouTubeCaptionTrack | null => {
  const rankedEntry = entries
    .map((entry, index) => ({
      entry,
      index,
      rank: getEnglishCaptionLanguageRank(entry.language)
    }))
    .filter(candidate => Number.isFinite(candidate.rank))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)[0]

  return rankedEntry ? choosePreferredTrack(rankedEntry.entry) : null
}

const findFirstTrack = (entries: CaptionEntry[]): YouTubeCaptionTrack | null => {
  const entry = entries[0]
  return entry ? choosePreferredTrack(entry) : null
}

export const selectYouTubeCaptionTrack = (
  data: { subtitles?: unknown, automatic_captions?: unknown }
): YouTubeCaptionTrack | null => {
  const manualEntries = getCaptionEntries(data.subtitles, 'manual')
  const automaticEntries = getCaptionEntries(data.automatic_captions, 'automatic')

  return findEnglishTrack(manualEntries)
    ?? findEnglishTrack(automaticEntries)
    ?? findFirstTrack(manualEntries)
    ?? findFirstTrack(automaticEntries)
}

export const toYouTubeCaptionMetadata = (
  track: YouTubeCaptionTrack | null | undefined
): YouTubeCaptionMetadata => {
  if (!track) {
    return { available: false }
  }

  return {
    available: true,
    source: track.source,
    language: track.language,
    ...(track.languageName ? { languageName: track.languageName } : {})
  }
}

export const getYouTubeCaptionSourceLabel = (
  source: YouTubeCaptionSource | undefined
): string => {
  return source === 'automatic' ? 'auto-generated' : 'creator-provided'
}

import type { TranscriptionResult,TranscriptionSegment } from '~/types'
import { formatTimestamp } from '../transcription-helpers'

type CaptionCue = {
  startSeconds: number
  endSeconds: number
  text: string
}

type ParseOptions = {
  dedupe?: boolean
}

const normalizeWhitespace = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim()
}

const cleanCaptionText = (value: string): string => {
  return normalizeWhitespace(
    value
      .replace(/<\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{3})?>/g, '')
      .replace(/<\/?[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  )
}

const normalizeToken = (value: string): string => {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

export const removeRepeatedCaptionPrefix = (
  previousText: string,
  nextText: string
): string => {
  const previousTokens = normalizeWhitespace(previousText).split(/\s+/).filter(Boolean)
  const nextTokens = normalizeWhitespace(nextText).split(/\s+/).filter(Boolean)

  if (previousTokens.length === 0 || nextTokens.length === 0) {
    return nextText.trim()
  }

  const previousNormalized = previousTokens.map(normalizeToken)
  const nextNormalized = nextTokens.map(normalizeToken)
  const maxOverlap = Math.min(previousNormalized.length, nextNormalized.length)

  for (let overlap = maxOverlap; overlap > 0; overlap--) {
    let matches = true
    for (let index = 0; index < overlap; index++) {
      const previousToken = previousNormalized[previousNormalized.length - overlap + index]
      const nextToken = nextNormalized[index]
      if (!previousToken || !nextToken || previousToken !== nextToken) {
        matches = false
        break
      }
    }

    if (matches) {
      return nextTokens.slice(overlap).join(' ').trim()
    }
  }

  return nextText.trim()
}

const buildTranscriptionResult = (
  cues: CaptionCue[],
  options: ParseOptions = {}
): TranscriptionResult => {
  const segments: TranscriptionSegment[] = []
  const textParts: string[] = []

  for (const cue of cues) {
    const cleanText = cleanCaptionText(cue.text)
    if (!cleanText) continue

    const text = options.dedupe
      ? removeRepeatedCaptionPrefix(textParts.join(' '), cleanText)
      : cleanText

    if (!text) continue

    textParts.push(text)
    segments.push({
      start: formatTimestamp(cue.startSeconds),
      end: formatTimestamp(Math.max(cue.endSeconds, cue.startSeconds)),
      text
    })
  }

  return {
    text: textParts.join(' '),
    segments
  }
}

const getJson3EventText = (event: Record<string, unknown>): string => {
  if (!Array.isArray(event.segs)) return ''

  return event.segs
    .map(seg => {
      if (!seg || typeof seg !== 'object') return ''
      const text = (seg as Record<string, unknown>).utf8
      return typeof text === 'string' ? text : ''
    })
    .join('')
}

export const parseYouTubeJson3Captions = (
  content: string,
  options: ParseOptions = {}
): TranscriptionResult => {
  const data = JSON.parse(content) as Record<string, unknown>
  const events = Array.isArray(data.events) ? data.events : []
  const cues: CaptionCue[] = []

  for (const event of events) {
    if (!event || typeof event !== 'object') continue
    const record = event as Record<string, unknown>
    const startMs = typeof record.tStartMs === 'number' ? record.tStartMs : undefined
    if (startMs == null || !Number.isFinite(startMs)) continue

    const durationMs = typeof record.dDurationMs === 'number' && Number.isFinite(record.dDurationMs)
      ? record.dDurationMs
      : 0
    const text = getJson3EventText(record)

    cues.push({
      startSeconds: startMs / 1000,
      endSeconds: (startMs + Math.max(0, durationMs)) / 1000,
      text
    })
  }

  return buildTranscriptionResult(cues, options)
}

const parseVttTimestampSeconds = (value: string): number | null => {
  const parts = value.trim().split(':')
  if (parts.length < 2 || parts.length > 3) return null

  const secondsPart = parts[parts.length - 1]!
  const seconds = parseFloat(secondsPart)
  const minutes = Number(parts[parts.length - 2])
  const hours = parts.length === 3 ? Number(parts[0]) : 0

  if (![seconds, minutes, hours].every(Number.isFinite)) {
    return null
  }

  return (hours * 3600) + (minutes * 60) + seconds
}

const VTT_TIMING_PATTERN = /^\s*((?:\d{1,2}:)?\d{2}:\d{2}(?:\.\d{3})?)\s+-->\s+((?:\d{1,2}:)?\d{2}:\d{2}(?:\.\d{3})?)/

export const parseYouTubeVttCaptions = (
  content: string,
  options: ParseOptions = {}
): TranscriptionResult => {
  const blocks = content.replace(/\r/g, '').split(/\n{2,}/)
  const cues: CaptionCue[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean)
    if (lines.length === 0 || lines[0] === 'WEBVTT' || lines[0]?.startsWith('NOTE')) {
      continue
    }

    const timingIndex = lines.findIndex(line => VTT_TIMING_PATTERN.test(line))
    if (timingIndex < 0) continue

    const timingLine = lines[timingIndex]!
    const match = timingLine.match(VTT_TIMING_PATTERN)
    if (!match) continue

    const startSeconds = parseVttTimestampSeconds(match[1]!)
    const endSeconds = parseVttTimestampSeconds(match[2]!)
    if (startSeconds == null || endSeconds == null) continue

    cues.push({
      startSeconds,
      endSeconds,
      text: lines.slice(timingIndex + 1).join(' ')
    })
  }

  return buildTranscriptionResult(cues, options)
}

export const parseYouTubeCaptionContent = (
  content: string,
  ext: 'json3' | 'vtt',
  options: ParseOptions = {}
): TranscriptionResult => {
  return ext === 'json3'
    ? parseYouTubeJson3Captions(content, options)
    : parseYouTubeVttCaptions(content, options)
}

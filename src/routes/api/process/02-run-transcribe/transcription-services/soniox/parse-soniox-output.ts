import { l } from '~/utils/logging'
import { formatTimestamp } from '~/utils/audio'
import type { TranscriptionSegment, SonioxTranscriptResponse, SonioxToken } from '~/types'
import { adjustTimestamp } from '../transcription-helpers'

const normalizeSpeaker = (speaker: string | number | undefined): string | undefined => {
  if (speaker === undefined || speaker === null) return undefined
  return `Speaker ${speaker}`
}

const groupTokensBySpeaker = (
  tokens: SonioxToken[]
): Array<{ speaker: string | undefined; text: string; start: number; end: number }> => {
  const groups: Array<{ speaker: string | undefined; text: string; start: number; end: number }> = []
  let currentGroup: { speaker: string | number | undefined; words: string[]; start: number; end: number } | null = null

  for (const token of tokens) {
    const speaker = token.speaker
    const startMs = token.start_ms ?? 0
    const endMs = token.end_ms ?? startMs

    if (!currentGroup || currentGroup.speaker !== speaker) {
      if (currentGroup) {
        groups.push({
          speaker: normalizeSpeaker(currentGroup.speaker),
          text: currentGroup.words.join(''),
          start: currentGroup.start,
          end: currentGroup.end
        })
      }
      currentGroup = {
        speaker,
        words: [token.text],
        start: startMs,
        end: endMs
      }
    } else {
      currentGroup.words.push(token.text)
      currentGroup.end = endMs
    }
  }

  if (currentGroup) {
    groups.push({
      speaker: normalizeSpeaker(currentGroup.speaker),
      text: currentGroup.words.join(''),
      start: currentGroup.start,
      end: currentGroup.end
    })
  }

  return groups
}

export const parseSonioxOutput = (
  response: SonioxTranscriptResponse,
  offsetMinutes: number = 0
): { text: string; segments: TranscriptionSegment[] } => {
  const segments: TranscriptionSegment[] = []
  let fullText = ''

  if (response.tokens && response.tokens.length > 0) {
    const groups = groupTokensBySpeaker(response.tokens)
    const textParts: string[] = []

    for (const group of groups) {
      const startSeconds = group.start / 1000
      const endSeconds = group.end / 1000

      const formattedStart = formatTimestamp(startSeconds)
      const formattedEnd = formatTimestamp(endSeconds)

      const trimmedText = group.text.trim()

      segments.push({
        start: offsetMinutes > 0 ? adjustTimestamp(formattedStart, offsetMinutes) : formattedStart,
        end: offsetMinutes > 0 ? adjustTimestamp(formattedEnd, offsetMinutes) : formattedEnd,
        text: trimmedText,
        speaker: group.speaker
      })

      textParts.push(trimmedText)
    }

    fullText = textParts.join(' ')
  } else if (response.text) {
    fullText = response.text
    segments.push({
      start: offsetMinutes > 0 ? adjustTimestamp('00:00:00', offsetMinutes) : '00:00:00',
      end: offsetMinutes > 0 ? adjustTimestamp('00:00:00', offsetMinutes) : '00:00:00',
      text: response.text,
      speaker: undefined
    })
  }

  const speakerSet = new Set(segments.map(seg => seg.speaker).filter(Boolean))

  l('Parsed Soniox transcript', {
    tokenCount: response.tokens?.length ?? 0,
    segmentCount: segments.length,
    transcriptLength: fullText.length,
    speakerCount: speakerSet.size
  })

  return {
    text: fullText,
    segments
  }
}

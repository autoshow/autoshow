import { l } from '~/utils/logging'
import { formatTimestamp } from '~/utils/audio'
import type { TranscriptionSegment, SixtyDbSttResponse } from '~/types'
import { adjustTimestamp } from '../transcription-helpers'

const normalizeSpeaker = (speaker: string | undefined | null): string | undefined => {
  if (!speaker) return undefined
  const match = /^SPEAKER_0*(\d+)$/i.exec(speaker)
  if (match) return `Speaker ${parseInt(match[1]!, 10)}`
  return speaker
}

export const parse60dbOutput = (
  response: SixtyDbSttResponse,
  offsetMinutes: number = 0
): { text: string, segments: TranscriptionSegment[] } => {
  const segments: TranscriptionSegment[] = []

  const sourceSegments = response.segments ?? []
  for (const seg of sourceSegments) {
    const speakerRaw = seg.speakers && seg.speakers.length > 0 ? seg.speakers[0] : seg.speaker
    const speaker = normalizeSpeaker(speakerRaw)

    const formattedStart = formatTimestamp(seg.start)
    const formattedEnd = formatTimestamp(seg.end)

    segments.push({
      start: offsetMinutes > 0 ? adjustTimestamp(formattedStart, offsetMinutes) : formattedStart,
      end: offsetMinutes > 0 ? adjustTimestamp(formattedEnd, offsetMinutes) : formattedEnd,
      text: seg.text.trim(),
      speaker
    })
  }

  if (segments.length === 0 && response.text) {
    segments.push({
      start: offsetMinutes > 0 ? adjustTimestamp('00:00:00', offsetMinutes) : '00:00:00',
      end: offsetMinutes > 0 ? adjustTimestamp('00:00:00', offsetMinutes) : '00:00:00',
      text: response.text,
      speaker: undefined
    })
  }

  const speakerSet = new Set(segments.map(seg => seg.speaker).filter(Boolean))

  l('Parsed 60db transcript', {
    segmentCount: segments.length,
    transcriptLength: response.text.length,
    speakerCount: speakerSet.size,
    language: response.language ?? undefined
  })

  return {
    text: response.text,
    segments
  }
}

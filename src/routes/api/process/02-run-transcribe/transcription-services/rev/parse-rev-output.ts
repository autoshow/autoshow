import { l } from '~/utils/logging'
import { formatTimestamp } from '~/utils/audio'
import type { TranscriptionSegment, RevTranscriptResponse } from '~/types'
import { adjustTimestamp } from '../transcription-helpers'

export const parseRevOutput = (
  response: RevTranscriptResponse,
  offsetMinutes: number = 0
): { text: string, segments: TranscriptionSegment[] } => {
  const segments: TranscriptionSegment[] = []
  const textParts: string[] = []

  for (const monologue of response.monologues) {
    const speakerLabel = monologue.speaker !== undefined ? `Speaker ${monologue.speaker}` : undefined
    let segmentText = ''
    let segmentStart: number | undefined
    let segmentEnd: number | undefined

    for (const element of monologue.elements) {
      if (element.type === 'text') {
        segmentText += element.value
        if (element.ts !== undefined && segmentStart === undefined) {
          segmentStart = element.ts
        }
        if (element.end_ts !== undefined) {
          segmentEnd = element.end_ts
        }
      } else if (element.type === 'punct') {
        segmentText += element.value
      }
    }

    if (segmentText.trim()) {
      textParts.push(segmentText.trim())

      const startSeconds = segmentStart ?? 0
      const endSeconds = segmentEnd ?? startSeconds

      const formattedStart = formatTimestamp(startSeconds)
      const formattedEnd = formatTimestamp(endSeconds)

      segments.push({
        start: offsetMinutes > 0 ? adjustTimestamp(formattedStart, offsetMinutes) : formattedStart,
        end: offsetMinutes > 0 ? adjustTimestamp(formattedEnd, offsetMinutes) : formattedEnd,
        text: segmentText.trim(),
        speaker: speakerLabel
      })
    }
  }

  const speakerSet = new Set(segments.map(seg => seg.speaker).filter(Boolean))
  const fullText = textParts.join(' ')

  l('Parsed Rev.ai transcript', {
    monologueCount: response.monologues.length,
    segmentCount: segments.length,
    transcriptLength: fullText.length,
    speakerCount: speakerSet.size
  })

  return {
    text: fullText,
    segments
  }
}

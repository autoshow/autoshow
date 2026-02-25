import { l } from '~/utils/logging'
import { formatTimestamp } from '~/utils/audio'
import type { TranscriptionSegment, GladiaTranscriptionStatusResponse, GladiaUtterance } from '~/types'
import { adjustTimestamp } from '../transcription-helpers'

export const parseGladiaOutput = (
  response: GladiaTranscriptionStatusResponse,
  offsetMinutes: number = 0
): { text: string, segments: TranscriptionSegment[] } => {
  const result = response.result

  if (!result || !result.transcription) {
    throw new Error('Gladia response missing transcription result')
  }

  const { full_transcript, utterances } = result.transcription

  const segments: TranscriptionSegment[] = utterances.map((utterance: GladiaUtterance) => {
    const speakerLabel = utterance.speaker !== undefined ? `Speaker ${utterance.speaker}` : undefined
    const formattedStart = formatTimestamp(utterance.start)
    const formattedEnd = formatTimestamp(utterance.end)

    return {
      start: offsetMinutes > 0 ? adjustTimestamp(formattedStart, offsetMinutes) : formattedStart,
      end: offsetMinutes > 0 ? adjustTimestamp(formattedEnd, offsetMinutes) : formattedEnd,
      text: utterance.text.trim(),
      speaker: speakerLabel
    }
  })

  const speakerSet = new Set(segments.map(seg => seg.speaker).filter(Boolean))

  l('Parsed Gladia transcript', {
    utteranceCount: utterances.length,
    segmentCount: segments.length,
    transcriptLength: full_transcript.length,
    speakerCount: speakerSet.size,
    audioDuration: result.metadata.audio_duration,
    transcriptionTime: result.metadata.transcription_time
  })

  return {
    text: full_transcript,
    segments
  }
}

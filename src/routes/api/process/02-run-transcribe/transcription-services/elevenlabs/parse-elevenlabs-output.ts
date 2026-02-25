import { l } from '~/utils/logging'
import { formatTimestamp } from '~/utils/audio'
import type { TranscriptionSegment, ElevenLabsScribeResponse } from '~/types'
import { adjustTimestamp } from '../transcription-helpers'

export const parseElevenLabsOutput = (
  response: ElevenLabsScribeResponse,
  offsetMinutes: number = 0
): { text: string, segments: TranscriptionSegment[] } => {
  const segments: TranscriptionSegment[] = []
  let currentSegment: { start: number, end: number, text: string, speaker: string | undefined } | null = null

  for (const word of response.words) {
    if (word.type === 'audio_event') continue

    const speakerLabel = word.speaker_id ? `Speaker ${word.speaker_id}` : undefined

    if (!currentSegment) {
      currentSegment = {
        start: word.start,
        end: word.end,
        text: word.text,
        speaker: speakerLabel
      }
    } else if (currentSegment.speaker === speakerLabel) {
      currentSegment.end = word.end
      currentSegment.text += word.type === 'spacing' ? word.text : ` ${word.text}`
    } else {
      const formattedStart = formatTimestamp(currentSegment.start)
      const formattedEnd = formatTimestamp(currentSegment.end)
      segments.push({
        start: offsetMinutes > 0 ? adjustTimestamp(formattedStart, offsetMinutes) : formattedStart,
        end: offsetMinutes > 0 ? adjustTimestamp(formattedEnd, offsetMinutes) : formattedEnd,
        text: currentSegment.text.trim(),
        speaker: currentSegment.speaker
      })
      currentSegment = {
        start: word.start,
        end: word.end,
        text: word.text,
        speaker: speakerLabel
      }
    }
  }

  if (currentSegment) {
    const formattedStart = formatTimestamp(currentSegment.start)
    const formattedEnd = formatTimestamp(currentSegment.end)
    segments.push({
      start: offsetMinutes > 0 ? adjustTimestamp(formattedStart, offsetMinutes) : formattedStart,
      end: offsetMinutes > 0 ? adjustTimestamp(formattedEnd, offsetMinutes) : formattedEnd,
      text: currentSegment.text.trim(),
      speaker: currentSegment.speaker
    })
  }

  const speakerSet = new Set(segments.map(seg => seg.speaker).filter(Boolean))

  l('Parsed ElevenLabs transcript', {
    wordCount: response.words.length,
    segmentCount: segments.length,
    transcriptLength: response.text.length,
    speakerCount: speakerSet.size,
    language: response.language_code
  })

  return {
    text: response.text,
    segments
  }
}

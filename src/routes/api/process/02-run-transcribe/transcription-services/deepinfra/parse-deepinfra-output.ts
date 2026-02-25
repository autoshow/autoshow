import { l } from '~/utils/logging'
import { formatTimestamp } from '~/utils/audio'
import type { TranscriptionSegment, OpenAIVerboseTranscription } from '~/types'

export const parseDeepInfraOutput = (
  response: OpenAIVerboseTranscription,
  offsetMinutes: number = 0
): { text: string, segments: TranscriptionSegment[] } => {
  const offsetSeconds = offsetMinutes * 60
  const segments: TranscriptionSegment[] = []

  if (response.segments && Array.isArray(response.segments)) {
    response.segments.forEach((seg) => {
      if (seg.text && seg.text.trim().length > 0) {
        const startSeconds = (seg.start || 0) + offsetSeconds
        const endSeconds = (seg.end || 0) + offsetSeconds

        segments.push({
          start: formatTimestamp(startSeconds),
          end: formatTimestamp(endSeconds),
          text: seg.text.trim()
        })
      }
    })
  } else {
    segments.push({
      start: formatTimestamp(offsetSeconds),
      end: formatTimestamp(offsetSeconds),
      text: response.text || ''
    })
  }

  const fullText = segments.map(seg => seg.text).join(' ')

  l('Parsed DeepInfra transcript', {
    segmentCount: segments.length,
    transcriptLength: fullText.length,
    language: response.language,
    duration: response.duration
  })

  return { text: fullText, segments }
}

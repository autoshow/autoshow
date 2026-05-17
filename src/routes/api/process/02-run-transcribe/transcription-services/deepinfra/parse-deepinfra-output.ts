import type { SourceRoutesApiProcess02RunTranscribeTranscriptionServicesDeepinfraParseDeepinfraOutputDeepInfraNativeResponse as DeepInfraNativeResponse,TranscriptionSegment } from '~/types'
import { formatTimestamp } from '../transcription-helpers'

export const parseDeepInfraOutput = (
  response: DeepInfraNativeResponse,
  offsetMinutes: number = 0
): { text: string, segments: TranscriptionSegment[], cost?: number } => {
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
  const cost = response.inference_status?.cost

  const result: { text: string, segments: TranscriptionSegment[], cost?: number } = { text: fullText, segments }
  if (cost != null) {
    result.cost = cost
  }
  return result
}

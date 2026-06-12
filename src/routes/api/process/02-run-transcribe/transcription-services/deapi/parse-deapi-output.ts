import type { DeapiStatusResponse,TranscriptionResult,TranscriptionSegment } from '~/types'
import { formatTimestamp } from '../transcription-helpers'

const DEAPI_API_KEY = process.env['DEAPI_API_KEY']

const parseTextTranscript = (text: string): TranscriptionResult => {
  const lines = text.split('\n').filter(line => line.trim())
  const segments: TranscriptionSegment[] = []
  const textParts: string[] = []

  const timestampRegex = /^\[(\d+:\d+(?::\d+)?)\s*-\s*(\d+:\d+(?::\d+)?)\]\s*(.*)$/

  for (const line of lines) {
    const match = line.match(timestampRegex)
    if (match) {
      const [, start, end, segmentText] = match
      segments.push({
        start: start!,
        end: end!,
        text: segmentText!.trim()
      })
      textParts.push(segmentText!.trim())
    } else if (line.trim()) {
      textParts.push(line.trim())
    }
  }

  return {
    text: textParts.join(' '),
    segments
  }
}

const parseDurationFromTimestamp = (timestamp: string): number => {
  const parts = timestamp.split(':').map(Number)
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!
  return parts[0] ?? 0
}

const getDurationFromSegments = (segments: TranscriptionSegment[]): number | undefined => {
  if (segments.length === 0) return undefined
  const lastSegment = segments[segments.length - 1]!
  return parseDurationFromTimestamp(lastSegment.end)
}

export const parseDeapiOutput = async (
  response: DeapiStatusResponse
): Promise<{ transcription: TranscriptionResult; durationSeconds?: number }> => {
  const { result_url, result } = response.data

  if (result) {

    const segments = (result.segments || [])
    const lastSeg = segments[segments.length - 1]

    return {
      transcription: {
        text: result.text,
        segments: segments.map(seg => ({
          start: formatTimestamp(seg.start),
          end: formatTimestamp(seg.end),
          text: seg.text.trim()
        }))
      },
      ...(lastSeg ? { durationSeconds: lastSeg.end } : {})
    }
  }

  if (result_url) {
    if (!DEAPI_API_KEY) {
      throw new Error('DEAPI_API_KEY environment variable is required')
    }

    const resultResponse = await fetch(result_url, {
      headers: {
        'Authorization': `Bearer ${DEAPI_API_KEY}`
      }
    })

    const responseText = await resultResponse.text()

    if (!resultResponse.ok) {
      throw new Error(`Failed to fetch deAPI result: ${resultResponse.statusText} - ${responseText}`)
    }

    const transcription = parseTextTranscript(responseText)
    const duration = getDurationFromSegments(transcription.segments)

    return { transcription, ...(duration != null ? { durationSeconds: duration } : {}) }
  }

  throw new Error('deAPI response missing transcription result')
}

import { l } from '~/utils/logging'
import { formatTimestamp } from '~/utils/audio'
import type { TranscriptionSegment, FalWhisperOutput, FalWhisperChunk } from '~/types'

export const parseFalOutput = (
  response: FalWhisperOutput,
  offsetMinutes: number = 0
): { text: string, segments: TranscriptionSegment[] } => {
  const offsetSeconds = offsetMinutes * 60
  const segments: TranscriptionSegment[] = []

  if (response.chunks && Array.isArray(response.chunks)) {
    response.chunks.forEach((chunk: FalWhisperChunk) => {
      if (chunk.text && chunk.text.trim().length > 0) {
        const startSeconds = (chunk.timestamp[0] || 0) + offsetSeconds
        const endSeconds = (chunk.timestamp[1] || 0) + offsetSeconds

        let speaker = chunk.speaker

        if (!speaker && response.diarization_segments) {
          const chunkStart = chunk.timestamp[0] || 0
          const matchingSegment = response.diarization_segments.find(seg =>
            chunkStart >= seg.timestamp[0] && (seg.timestamp[1] === null || chunkStart < seg.timestamp[1])
          )
          if (matchingSegment?.speaker) {
            speaker = matchingSegment.speaker
          }
        }

        segments.push({
          start: formatTimestamp(startSeconds),
          end: formatTimestamp(endSeconds),
          text: chunk.text.trim(),
          speaker: speaker || undefined
        })
      }
    })
  } else {
    segments.push({
      start: formatTimestamp(offsetSeconds),
      end: formatTimestamp(offsetSeconds),
      text: response.text || '',
      speaker: undefined
    })
  }

  const fullText = segments.map(seg => seg.text).join(' ')

  const speakerSet = new Set(segments.map(seg => seg.speaker).filter(Boolean))

  l('Parsed Fal transcript', {
    chunkCount: response.chunks?.length || 0,
    segmentCount: segments.length,
    transcriptLength: fullText.length,
    speakerCount: speakerSet.size
  })

  return { text: fullText, segments }
}

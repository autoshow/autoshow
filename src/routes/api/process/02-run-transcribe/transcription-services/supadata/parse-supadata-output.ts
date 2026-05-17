import type { SupadataChunk,TranscriptionResult,TranscriptionSegment } from '~/types'

const formatMsToTimestamp = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const parseSupadataOutput = (chunks: SupadataChunk[]): { transcription: TranscriptionResult; durationSeconds?: number } => {
  const segments: TranscriptionSegment[] = chunks.map(chunk => ({
    start: formatMsToTimestamp(chunk.offset),
    end: formatMsToTimestamp(chunk.offset + chunk.duration),
    text: chunk.text.trim()
  }))

  const text = chunks.map(chunk => chunk.text.trim()).join(' ')

  const lastChunk = chunks[chunks.length - 1]

  return {
    transcription: { text, segments },
    ...(lastChunk ? { durationSeconds: (lastChunk.offset + lastChunk.duration) / 1000 } : {})
  }
}

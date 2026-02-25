import type { TranscriptionSegment } from '~/types'

export const adjustTimestamp = (timestamp: string, offsetMinutes: number): string => {
  if (offsetMinutes === 0) return timestamp

  const parts = timestamp.split(':')
  if (parts.length < 2) return timestamp

  const hours = parseInt(parts[0] || '0', 10)
  const minutes = parseInt(parts[1] || '0', 10) + offsetMinutes
  const seconds = parts.slice(2).join(':')

  const newHours = hours + Math.floor(minutes / 60)
  const newMinutes = minutes % 60

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${seconds}`
}

export const formatTranscriptOutput = (segments: TranscriptionSegment[]): string => {
  return segments
    .map(seg => {
      const speakerPrefix = seg.speaker ? `[${seg.speaker}] ` : ''
      return `[${seg.start}] ${speakerPrefix}${seg.text}`
    })
    .join('\n')
}

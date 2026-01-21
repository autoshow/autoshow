import type { TranscriptionSegment } from '~/types/main'

const formatTimestamp = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export const parseGroqOutput = (transcription: any, offsetMinutes: number = 0): { text: string, segments: TranscriptionSegment[] } => {
  const offsetSeconds = offsetMinutes * 60
  const segments: TranscriptionSegment[] = []
  
  if (transcription.segments && Array.isArray(transcription.segments)) {
    transcription.segments.forEach((seg: any) => {
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
      text: transcription.text || ''
    })
  }
  
  const fullText = segments.map(seg => seg.text).join(' ')
  
  return { text: fullText, segments }
}
import { HappyScribeJsonOutputSchema,validateOrThrow,type HappyScribeSegment,type HappyScribeWord,type TranscriptionSegment } from '~/types'
import { formatTimestamp } from '../transcription-helpers'

export const parseHappyScribeOutput = (jsonContent: string): { text: string, segments: TranscriptionSegment[] } => {
  let data: unknown
  
  try {
    data = JSON.parse(jsonContent)
  } catch (error) {
    throw new Error('Invalid JSON from HappyScribe')
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Invalid HappyScribe response format')
  }
  
  const segments_data = validateOrThrow(HappyScribeJsonOutputSchema, data, 'Invalid HappyScribe output format')
  
  const segments: TranscriptionSegment[] = []
  let currentSegmentWords: string[] = []
  let segmentStartTime = 0
  let segmentEndTime = 0
  let currentSpeaker: string | undefined = undefined
  const wordsPerSegment = 35
  
  let totalWords = 0
  
  segments_data.forEach((segment: HappyScribeSegment, segmentIndex: number) => {
    totalWords += segment.words.length
    
    segment.words.forEach((word: HappyScribeWord, wordIndex: number) => {
      if (currentSegmentWords.length === 0) {
        segmentStartTime = word.data_start
        currentSpeaker = segment.speaker
      }
      
      currentSegmentWords.push(word.text)
      segmentEndTime = word.data_end
      
      const speakerChanged = segment.speaker !== currentSpeaker
      const reachedTargetLength = currentSegmentWords.length >= wordsPerSegment
      const isLastWord = segmentIndex === segments_data.length - 1 && 
                        wordIndex === segment.words.length - 1
      
      if (speakerChanged || reachedTargetLength || isLastWord) {
        if (currentSegmentWords.length > 0) {
          const newSegment = {
            start: formatTimestamp(segmentStartTime),
            end: formatTimestamp(segmentEndTime),
            text: currentSegmentWords.join(' '),
            speaker: currentSpeaker
          }
          segments.push(newSegment)
        }
        
        currentSegmentWords = []
        
        if (speakerChanged && !isLastWord) {
          currentSegmentWords.push(word.text)
          segmentStartTime = word.data_start
          segmentEndTime = word.data_end
          currentSpeaker = segment.speaker
        }
      }
    })
  })
  
  const fullText = segments.map(seg => seg.text).join(' ')
  
  
  
  return { text: fullText, segments }
}
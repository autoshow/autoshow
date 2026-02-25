import { l, err } from '~/utils/logging'
import { formatTimestamp } from '~/utils/audio'
import { HappyScribeJsonOutputSchema, validateOrThrow, type TranscriptionSegment, type HappyScribeSegment, type HappyScribeWord } from '~/types'

export const parseHappyScribeOutput = (jsonContent: string): { text: string, segments: TranscriptionSegment[] } => {
  let data: unknown
  
  try {
    data = JSON.parse(jsonContent)
  } catch (error) {
    err(`Failed to parse HappyScribe JSON`, error)
    throw new Error('Invalid JSON from HappyScribe')
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    err(`HappyScribe output is not an array or is empty`)
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
  
  const speakerSet = new Set(segments.map(seg => seg.speaker).filter(s => s))
  
  l('Parsed HappyScribe transcript', {
    sourceSegments: segments_data.length,
    outputSegments: segments.length,
    totalWords,
    transcriptLength: fullText.length,
    speakerCount: speakerSet.size
  })
  
  return { text: fullText, segments }
}

export const downloadTranscript = async (downloadUrl: string): Promise<string> => {
  const response = await fetch(downloadUrl)
  
  if (!response.ok) {
    err(`Failed to download transcript. Status: ${response.status}`)
    throw new Error(`Failed to download transcript: ${response.statusText}`)
  }
  
  const transcriptJson = await response.text()
  
  return transcriptJson
}
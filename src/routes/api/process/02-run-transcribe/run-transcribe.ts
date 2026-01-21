import type { ProcessingOptions } from '~/types/main'
import type { TranscriptionResult, Step2Metadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { transcribeWithGroq } from './transcription-services/groq/run-groq-whisper'
import { transcribeWithDeepInfra } from './transcription-services/deepinfra/run-deepinfra-whisper'
import { transcribeWithLemonfox } from './transcription-services/lemonfox/run-lemonfox-whisper'
import { splitAudioFile, getAudioDuration } from './audio-splitter'

export const transcribe = async (
  audioPath: string,
  options: ProcessingOptions,
  progressTracker?: IProgressTracker
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  if (options.transcriptionService === 'happyscribe') {
    throw new Error('HappyScribe is only supported for streaming URLs')
  }
  
  const getTranscriber = () => {
    switch (options.transcriptionService) {
      case 'deepinfra':
        return transcribeWithDeepInfra
      case 'lemonfox':
        return transcribeWithLemonfox
      case 'groq':
      default:
        return transcribeWithGroq
    }
  }
  
  const getDefaultModel = () => {
    switch (options.transcriptionService) {
      case 'deepinfra':
        return 'openai/whisper-large-v3-turbo'
      case 'lemonfox':
        return 'whisper-large-v3'
      case 'groq':
      default:
        return 'whisper-large-v3-turbo'
    }
  }
  
  const whisperModel = options.transcriptionModel || getDefaultModel()
  const transcriber = getTranscriber()
  
  progressTracker?.updateStepProgress(2, 5, 'Checking audio duration')
  const duration = await getAudioDuration(audioPath)
  
  if (duration > 600) {
    progressTracker?.updateStepProgress(2, 10, 'Audio exceeds 10 minutes - splitting into segments')
    
    const segmentPaths = await splitAudioFile(audioPath, options.outputDir, 10)
    
    progressTracker?.updateStepProgress(2, 20, `Split into ${segmentPaths.length} segments`)
    
    const segmentResults: Array<{ result: TranscriptionResult, metadata: Step2Metadata }> = []
    
    for (let i = 0; i < segmentPaths.length; i++) {
      const segmentPath = segmentPaths[i]!
      const segmentNumber = i + 1
      const offsetMinutes = i * 10
      
      const baseProgress = 20 + ((i / segmentPaths.length) * 70)
      progressTracker?.updateStepWithSubStep(2, segmentNumber, segmentPaths.length, `Segment ${segmentNumber}/${segmentPaths.length}`, `Transcribing segment ${segmentNumber} of ${segmentPaths.length}`)
      
      const segmentData = await transcriber(
        segmentPath, 
        options.outputDir,
        offsetMinutes,
        segmentNumber,
        segmentPaths.length,
        whisperModel,
        progressTracker,
        baseProgress
      )
      
      segmentResults.push(segmentData)
    }
    
    progressTracker?.updateStepProgress(2, 95, 'Combining transcription segments')
    
    const combinedResult = combineTranscriptionResults(segmentResults.map(s => s.result))
    
    const finalTranscriptPath = `${options.outputDir}/transcription.txt`
    
    const formattedTranscript = combinedResult.segments
      .map(seg => {
        const speakerPrefix = seg.speaker ? `[${seg.speaker}] ` : ''
        return `[${seg.start}] ${speakerPrefix}${seg.text}`
      })
      .join('\n')
    
    await Bun.write(finalTranscriptPath, formattedTranscript)
    
    const totalProcessingTime = segmentResults.reduce((sum, s) => sum + s.metadata.processingTime, 0)
    const totalTokenCount = segmentResults.reduce((sum, s) => sum + s.metadata.tokenCount, 0)
    
    const combinedMetadata: Step2Metadata = {
      transcriptionService: segmentResults[0]!.metadata.transcriptionService,
      transcriptionModel: segmentResults[0]!.metadata.transcriptionModel,
      processingTime: totalProcessingTime,
      tokenCount: totalTokenCount
    }
    
    progressTracker?.completeStep(2, 'Transcription complete')
    
    return { result: combinedResult, metadata: combinedMetadata }
  }
  
  progressTracker?.updateStepProgress(2, 15, 'Starting single-file transcription')
  
  return await transcriber(audioPath, options.outputDir, 0, undefined, undefined, whisperModel, progressTracker)
}

const combineTranscriptionResults = (results: TranscriptionResult[]): TranscriptionResult => {
  const combinedSegments = results.flatMap(result => result.segments)
  const combinedText = results.map(result => result.text).join(' ')
  
  return {
    text: combinedText,
    segments: combinedSegments
  }
}

import { l } from '~/utils/logging'
import type { ProcessingOptions, VideoMetadata } from '~/types/main'
import type { ProcessingMetadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { convertDirectUrlToAudio, createDirectUrlMetadata } from '~/routes/api/process/01-dl-audio/dl-direct-url'
import { transcribe } from '~/routes/api/process/02-run-transcribe/run-transcribe'
import { createOutputDirectory, processContentSelection, processLLMGeneration, processTTS, processImageGeneration, processMusicGeneration, processVideoGeneration, finalizeProcessing } from './processing-helpers'

const extractTitleFromUrl = (url: string): string => {
  const urlPathName = url.split('/').pop()?.split('?')[0] || ''
  const nameWithoutExtension = urlPathName.replace(/\.[^/.]+$/, '')
  return nameWithoutExtension || url
}

const extractMetadataForDirectUrl = (url: string, urlDuration?: number): VideoMetadata => {
  const duration = urlDuration 
    ? `${Math.floor(urlDuration / 60)}:${Math.floor(urlDuration % 60).toString().padStart(2, '0')}` 
    : 'unknown'
  
  return {
    title: extractTitleFromUrl(url),
    duration,
    author: 'Direct URL',
    description: `Processed from direct URL: ${url}`,
    url,
    publishDate: undefined,
    thumbnail: undefined,
    channelUrl: undefined
  }
}

export const processDirectUrl = async (options: ProcessingOptions, progressTracker: IProgressTracker): Promise<string> => {
  progressTracker.startStep(1, 'Extracting video metadata')
  
  l('Processing direct URL', { url: options.url })
  
  const metadata = extractMetadataForDirectUrl(options.url, options.urlDuration)
  
  progressTracker.updateStepProgress(1, 50, 'Creating output directory')
  
  const { showNoteId, outputDir } = await createOutputDirectory()
  
  progressTracker.completeStep(1, 'Metadata extracted successfully')
  
  const processingOptions: ProcessingOptions = {
    ...options,
    outputDir
  }
  
  progressTracker.updateStepProgress(1, 75, 'Converting audio format')

  const conversionResult = await convertDirectUrlToAudio(options.url, outputDir, showNoteId)

  const step1Metadata = createDirectUrlMetadata(
    options.url,
    conversionResult.wavPath,
    conversionResult.duration || options.urlDuration
  )
  
  progressTracker.startStep(2, 'Starting transcription')
  
  const transcriptionResult = await transcribe(conversionResult.wavPath, processingOptions, progressTracker)
  
  const step3Metadata = processContentSelection(processingOptions, progressTracker)
  
  const llmResult = await processLLMGeneration(metadata, transcriptionResult.result, processingOptions, progressTracker)
  
  const processingMetadata: ProcessingMetadata = {
    step1: step1Metadata,
    step2: transcriptionResult.metadata,
    step3: step3Metadata,
    step4: llmResult.metadata
  }
  
  const step5Metadata = await processTTS(processingOptions, progressTracker)
  if (step5Metadata) {
    processingMetadata.step5 = step5Metadata
  }
  
  const step6Metadata = await processImageGeneration(metadata, processingOptions, progressTracker)
  if (step6Metadata) {
    processingMetadata.step6 = step6Metadata
  }
  
  const step7Metadata = await processMusicGeneration(metadata, transcriptionResult.result, processingOptions, progressTracker)
  if (step7Metadata) {
    processingMetadata.step7 = step7Metadata
  }
  
  const step8Metadata = await processVideoGeneration(metadata, transcriptionResult.result, processingOptions, progressTracker)
  if (step8Metadata) {
    processingMetadata.step8 = step8Metadata
  }
  
  return await finalizeProcessing(showNoteId, metadata, processingOptions, processingMetadata, llmResult.promptInstructions)
}
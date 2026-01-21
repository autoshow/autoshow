import { l, err } from '~/utils/logging'
import type { ProcessingOptions, Step1Metadata } from '~/types/main'
import type { ProcessingMetadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'

import { convertFileToAudio, extractLocalFileMetadata, createFileMetadata } from '~/routes/api/process/01-dl-audio/dl-file'
import { transcribe } from '~/routes/api/process/02-run-transcribe/run-transcribe'
import { createOutputDirectory, processContentSelection, processLLMGeneration, processTTS, processImageGeneration, processMusicGeneration, processVideoGeneration, finalizeProcessing } from './processing-helpers'

export const processFile = async (options: ProcessingOptions, progressTracker: IProgressTracker): Promise<string> => {
  progressTracker.startStep(1, 'Processing local file')
  
  l('Processing local file', { url: options.url })
  
  if (!options.localFilePath || !options.localFileName) {
    err('Local file path and name are required')
    progressTracker.error(1, 'Missing file information', 'Local file path and name are required for file processing')
    throw new Error('Local file path and name are required for file processing')
  }
  
  progressTracker.updateStepProgress(1, 25, 'Extracting file metadata')
  
  const metadata = await extractLocalFileMetadata(options.localFilePath, options.localFileName)
  
  progressTracker.updateStepProgress(1, 50, 'Creating output directory')
  
  const { showNoteId, outputDir } = await createOutputDirectory()
  
  const processingOptions: ProcessingOptions = {
    ...options,
    outputDir
  }
  
  progressTracker.updateStepProgress(1, 75, 'Converting audio format')
  
  const result = await processLocalFileAudio(processingOptions)
  const audioPath = result.audioPath
  const step1Metadata = result.metadata
  
  progressTracker.completeStep(1, 'Audio processing complete')
  
  progressTracker.startStep(2, 'Starting transcription')
  
  const transcriptionResult = await transcribe(audioPath, processingOptions, progressTracker)
  
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

export const processLocalFileAudio = async (options: ProcessingOptions): Promise<{ audioPath: string, metadata: Step1Metadata }> => {
  if (!options.localFilePath || !options.localFileName) {
    throw new Error('Local file path and name are required')
  }
  
  const file = Bun.file(options.localFilePath)
  const fileSize = file.size
  
  if (fileSize < 1000) {
    throw new Error(`File is too small (${fileSize} bytes), likely corrupted or empty`)
  }
  
  const showNoteId = options.outputDir.split('/').pop() || 'unknown'
  const result = await convertFileToAudio(options.localFilePath, options.outputDir, showNoteId)
  const audioPath = result.wavPath
  
  const videoMetadata = await extractLocalFileMetadata(options.localFilePath, options.localFileName)
  
  const metadata = createFileMetadata(options.localFilePath, audioPath, videoMetadata)
  
  return { audioPath, metadata }
}
import { l, err } from '~/utils/logging'
import type { ProcessingOptions, Step1Metadata } from '~/types/main'
import type { ProcessingMetadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'

import { convertVideoToAudio, extractVideoMetadata, createVideoMetadata, downloadVideo } from '~/routes/api/process/01-dl-audio/dl-video'
import { transcribeWithHappyScribe } from '~/routes/api/process/02-run-transcribe/transcription-services/happyscribe/run-happyscribe'
import { createOutputDirectory, processContentSelection, processLLMGeneration, processTTS, processImageGeneration, processMusicGeneration, processVideoGeneration, finalizeProcessing } from './processing-helpers'

export const processVideo = async (options: ProcessingOptions, progressTracker: IProgressTracker): Promise<string> => {
  progressTracker.startStep(1, 'Extracting video metadata')
  
  l('Starting video processing', {
    url: options.url,
    urlType: options.urlType,
    selectedPrompts: options.selectedPrompts,
    transcriptionService: options.transcriptionService,
    llmModel: options.llmModel,
    ttsEnabled: options.ttsEnabled,
    imageGenEnabled: options.imageGenEnabled,
    videoGenEnabled: options.videoGenEnabled
  })
  
  const metadata = await extractVideoMetadata(options.url)
  
  progressTracker.updateStepProgress(1, 50, 'Creating output directory')
  
  const { showNoteId, outputDir } = await createOutputDirectory()
  
  progressTracker.completeStep(1, 'Metadata extracted successfully')
  
  const processingOptions: ProcessingOptions = {
    ...options,
    outputDir
  }
  
  let step1Metadata: Step1Metadata
  let transcriptionResult
  
  if (options.transcriptionService === 'happyscribe') {
    progressTracker.startStep(2, 'Starting HappyScribe transcription')
    
    transcriptionResult = await transcribeWithHappyScribe(options.url, metadata, processingOptions, progressTracker)
    
    step1Metadata = {
      videoUrl: options.url,
      videoTitle: metadata.title,
      videoPublishDate: metadata.publishDate,
      videoThumbnail: metadata.thumbnail,
      channelTitle: metadata.author,
      channelUrl: metadata.channelUrl,
      duration: metadata.duration,
      audioFileName: 'processed-by-happyscribe',
      audioFileSize: 0
    }
  } else {
    err(`Invalid transcription service for video URL: ${options.transcriptionService}`)
    progressTracker.error(2, 'Invalid transcription service', 'Please use HappyScribe for streaming URLs')
    throw new Error('Invalid transcription service for video URL. Please use HappyScribe for streaming URLs.')
  }
  
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

export const downloadAndConvertVideo = async (options: ProcessingOptions): Promise<{ audioPath: string, metadata: Step1Metadata }> => {
  const videoMetadata = await extractVideoMetadata(options.url)
  
  const videoPath = await downloadVideo(options.url, options.outputDir, options.useResilientDownload)
  
  const downloadedFile = Bun.file(videoPath)
  const fileSize = downloadedFile.size
  
  if (fileSize < 1000) {
    throw new Error(`File is too small (${fileSize} bytes), likely corrupted or empty`)
  }
  
  const showNoteId = options.outputDir.split('/').pop() || 'unknown'
  const audioResult = await convertVideoToAudio(videoPath, options.outputDir, showNoteId)
  const audioPath = audioResult.wavPath
  
  const metadata = createVideoMetadata(options.url, audioPath, videoMetadata)
  
  l('Downloaded and converted video', {
    url: options.url,
    videoPath,
    audioPath,
    fileSize
  })
  
  return { audioPath, metadata }
}
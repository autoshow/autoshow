import type { ProcessingOptions, VideoMetadata } from '~/types/main'
import type { ProcessingMetadata } from '~/types/main'
import type { Step3Metadata } from '~/types/main'
import type { TranscriptionResult } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { l, err } from '~/utils/logging'
import { runLLM } from '~/routes/api/process/04-run-llm/run-llm'
import { runTTS } from '~/routes/api/process/05-run-tts/run-tts'
import { generateImages } from '~/routes/api/process/06-run-image/run-image'
import { generateMusicTrack } from '~/routes/api/process/07-run-music/run-music'
import { generateVideos } from '~/routes/api/process/08-run-video/run-video'
import { saveResults } from '~/database/notes/create-show-note'

export const createOutputDirectory = async (): Promise<{ showNoteId: string, outputDir: string }> => {
  const showNoteId = Date.now().toString()
  const outputDir = `./output/${showNoteId}`
  const { exitCode } = await Bun.$`mkdir -p ${outputDir}`.quiet()
  if (exitCode !== 0) throw new Error(`Failed to create directory: ${outputDir}`)
  
  l('Created output directory', {
    showNoteId,
    outputDir
  })
  
  return { showNoteId, outputDir }
}

export const processContentSelection = (options: ProcessingOptions, progressTracker: IProgressTracker): Step3Metadata => {
  progressTracker.startStep(3, 'Selecting content prompts')
  
  const step3Metadata: Step3Metadata = {
    selectedPrompts: options.selectedPrompts
  }
  
  progressTracker.completeStep(3, 'Content prompts selected')
  
  return step3Metadata
}

export const processLLMGeneration = async (
  metadata: VideoMetadata,
  transcriptionResult: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker: IProgressTracker
) => {
  progressTracker.startStep(4, 'Starting LLM text generation')
  
  const result = await runLLM(metadata, transcriptionResult, options, progressTracker)
  
  return result
}

export const processTTS = async (
  options: ProcessingOptions,
  progressTracker: IProgressTracker
) => {
  if (!options.ttsEnabled || !options.ttsVoice || !options.ttsModel || !options.ttsService) {
    l('TTS skipped', { ttsEnabled: options.ttsEnabled })
    return undefined
  }
  
  progressTracker.startStep(5, 'Starting text-to-speech generation')
  
  const summaryPath = `${options.outputDir}/summary.md`
  const summaryText = await Bun.file(summaryPath).text()
  
  const ttsResult = await runTTS(
    summaryText, 
    options.outputDir, 
    options.ttsVoice, 
    options.ttsModel, 
    progressTracker, 
    options.ttsService
  )
  
  return ttsResult.metadata
}

export const processImageGeneration = async (
  metadata: VideoMetadata,
  options: ProcessingOptions,
  progressTracker: IProgressTracker
) => {
  if (!options.imageGenEnabled) {
    l('Image generation skipped', { imageGenEnabled: false })
    return undefined
  }
  
  if (!options.selectedImagePrompts || options.selectedImagePrompts.length === 0) {
    l('Image generation skipped', { reason: 'no prompts selected' })
    return undefined
  }
  
  const stepNumber = options.ttsEnabled ? 6 : 5
  progressTracker.startStep(stepNumber, 'Starting image generation')
  
  const summaryPath = `${options.outputDir}/summary.md`
  const summaryText = await Bun.file(summaryPath).text()
  
  const imageGenResult = await generateImages(
    metadata.title,
    summaryText,
    options.selectedImagePrompts,
    options.outputDir,
    progressTracker
  )
  
  l('Image generation completed', {
    imagesGenerated: imageGenResult.metadata.imagesGenerated,
    selectedPrompts: options.selectedImagePrompts
  })
  
  return imageGenResult.metadata
}

export const processMusicGeneration = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker: IProgressTracker
) => {
  if (!options.musicGenEnabled || !options.selectedMusicGenre) {
    l('Music generation skipped', { musicGenEnabled: options.musicGenEnabled })
    return undefined
  }
  
  let stepNumber = 5
  if (options.ttsEnabled) stepNumber++
  if (options.imageGenEnabled) stepNumber++
  
  progressTracker.startStep(stepNumber, 'Starting music generation')
  
  if (!options.llmModel) {
    err('LLM model required for music generation')
    throw new Error('LLM model is required for music lyrics generation')
  }
  
  const musicResult = await generateMusicTrack(
    metadata,
    transcription,
    options.selectedMusicGenre,
    options.outputDir,
    options.llmModel,
    progressTracker
  )
  
  l('Music generation completed', {
    selectedGenre: options.selectedMusicGenre,
    lyricsLength: musicResult.lyrics.length
  })
  
  return musicResult.metadata
}

export const processVideoGeneration = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker: IProgressTracker
) => {
  if (!options.videoGenEnabled) {
    l('Video generation skipped', { videoGenEnabled: false })
    return undefined
  }
  
  if (!options.selectedVideoPrompts || options.selectedVideoPrompts.length === 0) {
    l('Video generation skipped', { reason: 'no video types selected' })
    return undefined
  }
  
  if (!options.videoModel || !options.videoSize || !options.videoDuration) {
    l('Video generation skipped', { reason: 'missing video options' })
    return undefined
  }
  
  progressTracker.startStep(8, 'Starting video generation')
  
  if (!options.llmModel) {
    err('LLM model required for video generation')
    throw new Error('LLM model is required for video scene generation')
  }
  
  const videoResult = await generateVideos(
    metadata,
    transcription,
    options.selectedVideoPrompts,
    options.videoModel,
    options.videoSize,
    options.videoDuration,
    options.outputDir,
    options.llmModel,
    progressTracker
  )
  
  l('Video generation completed', {
    videosGenerated: videoResult.metadata.videosGenerated,
    selectedVideoPrompts: options.selectedVideoPrompts,
    videoModel: options.videoModel,
    videoSize: options.videoSize,
    videoDuration: options.videoDuration
  })
  
  return videoResult.metadata
}

export const finalizeProcessing = async (
  showNoteId: string,
  metadata: VideoMetadata,
  options: ProcessingOptions,
  processingMetadata: ProcessingMetadata,
  promptInstructions: string
): Promise<string> => {
  const metadataPath = `${options.outputDir}/metadata.json`
  await Bun.write(metadataPath, JSON.stringify(processingMetadata, null, 2))
  
  await saveResults(showNoteId, metadata, options, processingMetadata, promptInstructions)
  
  l('Processing finalized', {
    showNoteId,
    title: metadata.title,
    outputDir: options.outputDir,
    hasStep5: !!processingMetadata.step5,
    hasStep6: !!processingMetadata.step6,
    hasStep7: !!processingMetadata.step7,
    hasStep8: !!processingMetadata.step8
  })
  
  return showNoteId
}
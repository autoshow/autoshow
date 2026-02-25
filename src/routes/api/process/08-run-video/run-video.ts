import type { StructuredOutputProvider, Step8Metadata, VideoGenerationResult, VideoModel, VideoSize, VideoPromptType, TranscriptionResult, VideoMetadata, IProgressTracker, VideoGenServiceType, ProcessingOptions } from '~/types'
import { l, err } from '~/utils/logging'
import { runStructuredLLM } from '~/routes/api/process/04-run-llm/run-llm'
import { runOpenAIVideo } from './video-services/run-openai-video'
import { runGeminiVideo } from './video-services/run-gemini-video'
import { runMinimaxVideo } from './video-services/run-minimax-video'
import { runGrokVideo } from './video-services/run-grok-video'
import { buildVideoScenePrompt } from '~/prompts/video-prompts'
import { getCostPerSecond } from './video-services/video-helpers'

const VIDEO_SERVICE_MAP = {
  openai: runOpenAIVideo,
  gemini: runGeminiVideo,
  minimax: runMinimaxVideo,
  grok: runGrokVideo
} as const

export const generateVideos = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  selectedPrompts: VideoPromptType[],
  model: VideoModel,
  size: VideoSize,
  duration: number,
  outputDir: string,
  llmModel: string,
  progressTracker?: IProgressTracker,
  service: VideoGenServiceType = 'openai',
  aspectRatio?: string,
  llmService: StructuredOutputProvider = 'openai',
  jobId?: string
): Promise<{ results: VideoGenerationResult[], metadata: Step8Metadata }> => {
  const stepNumber = 8
  
  l('Step 8: Generate Videos', {
    service,
    videoTypes: selectedPrompts,
    model,
    size,
    duration: `${duration}s`,
    llmModel,
    aspectRatio: aspectRatio || 'default'
  })
  
  const generateVideo = VIDEO_SERVICE_MAP[service]
  if (!generateVideo) {
    throw new Error(`Unknown video service: ${service}`)
  }
  
  const startTime = Date.now()
  const results: VideoGenerationResult[] = []
  const totalVideos = selectedPrompts.length
  
  for (let i = 0; i < selectedPrompts.length; i++) {
    const videoType = selectedPrompts[i]
    if (!videoType) continue
    
    const videoIndex = i + 1
    const baseProgress = Math.floor((i / totalVideos) * 100)
    const progressPerVideo = Math.floor(100 / totalVideos)
    
    l('Generating video', {
      index: `${videoIndex}/${totalVideos}`,
      videoType
    })
    
    progressTracker?.updateStepWithSubStep(
      stepNumber,
      videoIndex,
      totalVideos,
      `Video ${videoIndex}/${totalVideos}`,
      `Generating scene description for ${videoType}`
    )
    
    const scenePrompt = buildVideoScenePrompt(metadata, transcription, videoType, size, duration)
    
    const scenePromptPath = `${outputDir}/video-scene-${videoType}.md`
    await Bun.write(scenePromptPath, scenePrompt)
    l('Scene prompt saved', { path: scenePromptPath })
    
    progressTracker?.updateStepProgress(
      stepNumber,
      baseProgress + Math.floor(progressPerVideo * 0.1),
      `Requesting scene description from LLM for ${videoType}`
    )

    const { response, metadata: llmMetadata } = await runStructuredLLM(
      llmService,
      scenePrompt,
      llmModel,
      ['text'],
      progressTracker
    )
    const sceneDescription = response.text ?? ''
    const sceneGenerationTime = llmMetadata.processingTime
    
    l('Scene description generated', {
      generationTime: `${sceneGenerationTime}ms`,
      length: `${sceneDescription.length} characters`
    })
    
    const sceneDescriptionPath = `${outputDir}/video-scene-description-${videoType}.md`
    await Bun.write(sceneDescriptionPath, sceneDescription)
    l('Scene description saved', { path: sceneDescriptionPath })
    
    const serviceLabel = service === 'gemini' ? 'Veo' : service === 'minimax' ? 'Hailuo' : service === 'grok' ? 'Grok' : 'Sora'
    progressTracker?.updateStepProgress(
      stepNumber,
      baseProgress + Math.floor(progressPerVideo * 0.2),
      `Starting ${serviceLabel} video render for ${videoType}`
    )
    
    const videoStartTime = Date.now()
    const videoResult = await generateVideo(
      sceneDescription,
      model,
      size,
      duration,
      outputDir,
      videoType,
      progressTracker,
      stepNumber,
      baseProgress + Math.floor(progressPerVideo * 0.2),
      baseProgress + Math.floor(progressPerVideo * 0.95),
      aspectRatio,
      jobId
    )
    const videoGenerationTime = Date.now() - videoStartTime

    const costPerSecond = getCostPerSecond(service, model)
    const videoCost = duration * costPerSecond

    l('Video generated', {
      path: videoResult.videoPath,
      generationTime: `${(videoGenerationTime / 1000).toFixed(1)}s`,
      cost: `$${videoCost.toFixed(4)}`
    })

    const videoFileName = videoResult.videoPath.split('/').pop() || `video_${videoType}.mp4`
    const thumbnailFileName = videoResult.thumbnailPath ? videoResult.thumbnailPath.split('/').pop() : undefined

    results.push({
      promptType: videoType,
      fileName: videoFileName,
      fileSize: videoResult.fileSize,
      processingTime: videoGenerationTime + sceneGenerationTime,
      duration,
      size,
      cost: videoCost,
      thumbnailFileName,
      scenePrompt: sceneDescription,
      scenePromptGenerationTime: sceneGenerationTime,
      s3Url: (videoResult as { s3Url?: string }).s3Url,
      thumbnailS3Url: (videoResult as { thumbnailS3Url?: string }).thumbnailS3Url
    })
    
    progressTracker?.updateStepProgress(
      stepNumber,
      baseProgress + progressPerVideo,
      `Video ${videoIndex}/${totalVideos} complete`
    )
  }
  
  const totalProcessingTime = Date.now() - startTime
  const totalCost = results.reduce((sum, result) => sum + result.cost, 0)

  l('Video generation completed', {
    totalTime: `${(totalProcessingTime / 1000).toFixed(1)}s`,
    videosGenerated: results.length,
    totalCost: `$${totalCost.toFixed(4)}`
  })

  const step8Metadata: Step8Metadata = {
    videoGenService: service,
    videoGenModel: model,
    processingTime: totalProcessingTime,
    videosGenerated: results.length,
    selectedPrompts,
    selectedSize: size,
    selectedDuration: duration,
    totalCost,
    results
  }
  
  progressTracker?.completeStep(stepNumber, 'Video generation complete')
  
  return { results, metadata: step8Metadata }
}

export const processVideoGeneration = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  jobId?: string
) => {
  l('Step 8: Video Generation', {
    videoGenEnabled: options.videoGenEnabled,
    selectedVideoPrompts: options.selectedVideoPrompts,
    videoModel: options.videoModel
  })

  if (!options.videoGenEnabled) {
    return undefined
  }

  if (!options.selectedVideoPrompts || options.selectedVideoPrompts.length === 0) {
    l('Video generation skipped', { reason: 'no video types selected' })
    return undefined
  }

  if (!options.videoService) {
    err('Video service required for video generation')
    throw new Error('Video service is required for video generation')
  }

  if (!options.videoModel || !options.videoSize || !options.videoDuration) {
    err('Video generation requires model, size, and duration')
    throw new Error('Video generation requires model, size, and duration')
  }

  progressTracker.startStep(8, 'Starting video generation')

  if (!options.llmModel) {
    err('LLM model required for video generation')
    throw new Error('LLM model is required for video scene generation')
  }

  if (!options.llmService) {
    err('LLM service required for video generation')
    throw new Error('LLM service is required for video scene generation')
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
    progressTracker,
    options.videoService as 'openai' | 'gemini' | 'minimax' | 'grok',
    options.videoAspectRatio,
    options.llmService as StructuredOutputProvider,
    jobId
  )

  l('Video generation completed', {
    videosGenerated: videoResult.metadata.videosGenerated,
    selectedVideoPrompts: options.selectedVideoPrompts,
    videoModel: options.videoModel,
    videoSize: options.videoSize,
    videoDuration: options.videoDuration,
    totalCost: `$${videoResult.metadata.totalCost.toFixed(4)}`
  })

  return videoResult.metadata
}

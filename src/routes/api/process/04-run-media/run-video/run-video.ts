import { getVideoServiceName,VIDEO_CONFIG } from '~/models'
import { getDefaultVideoModel,getDefaultVideoSize } from '~/models/models-config/video-config'
import { VIDEO_PROMPT_CONFIG } from '~/prompts/video-prompts'
import { runStructuredLLM } from '~/routes/api/process/03-write-and-tts/run-llm/run-llm'
import type { IProgressTracker,ProcessingOptions,Step8Metadata,StructuredOutputProvider,TranscriptionResult,SourceRoutesApiProcess04RunMediaRunVideoRunVideoVideoGenerationDependencies as VideoGenerationDependencies,VideoGenerationResult,VideoGenServiceType,VideoMetadata,VideoModel,VideoPromptType,VideoSize } from '~/types'
import { DEFAULT_AUX_LLM } from '~/utils/cost-helpers'
import { l } from '~/utils/logger/logging'
import { runDeapiVideo } from './video-services/run-deapi-video'
import { runDeepInfraVideo } from './video-services/run-deepinfra-video'
import { runGeminiVideo } from './video-services/run-gemini-video'
import { runGlmVideo } from './video-services/run-glm-video'
import { runGrokVideo } from './video-services/run-grok-video'
import { runMinimaxVideo } from './video-services/run-minimax-video'
import { runRunwayVideo } from './video-services/run-runway-video'
import { STEP_NUMBER } from './video-services/video-helpers'

export const buildVideoScenePrompt = (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  videoType: VideoPromptType,
  size: VideoSize,
  duration: number,
  customInstructions?: string
): string => {
  const config = VIDEO_PROMPT_CONFIG[videoType]

  const isPortrait = size === '1080x1920' || size === '720x1280' || size === '480x832'
  const orientationNote = isPortrait
    ? 'The video is in PORTRAIT orientation (vertical) - compose shots accordingly with subjects centered and vertical framing.'
    : 'The video is in LANDSCAPE orientation (horizontal) - compose shots with cinematic widescreen framing.'

  const trimmedCustomInstructions = customInstructions?.trim()
  const customInstructionBlock = trimmedCustomInstructions
    ? `\nAdditional user instructions:\n${trimmedCustomInstructions}\n`
    : '\n'

  return `You are an expert video director and cinematographer. Based on the following content, write a detailed scene description for ${config.typeDescription}.

${config.styleInstructions}
${customInstructionBlock}

Video Specifications:
- Duration: ${duration} seconds
- Resolution: ${size}
- ${orientationNote}

Content Title: ${metadata.title}
${metadata.author ? `Author/Creator: ${metadata.author}` : ''}

Content Summary (from transcript):
${transcription.text.substring(0, 3000)}

Safety and identity constraints:
- Do not use real names or depict identifiable real people from the source material.
- If a person is needed, describe an anonymous adult subject by role or vibe only.
- Prefer symbolic objects, environments, motion graphics, or generic workplace/public scenes over likeness-specific depictions.
- Avoid visible brand marks, trademarks, or copyrighted characters.

Write a single, cohesive scene description that the selected video model can render as one continuous ${duration}-second video. Include:

1. **Shot Type**: Camera angle and framing (wide shot, close-up, tracking shot, aerial view, etc.)
2. **Subject**: Main visual focus - be creative and specific to THIS content's themes
3. **Action/Motion**: What movement or changes occur throughout the ${duration} seconds
4. **Setting**: The environment or backdrop that fits the content's mood
5. **Lighting**: Lighting style that enhances the visual storytelling
6. **Camera Movement**: How the camera moves during the shot

Be creative and specific to the actual content. The scene should visually represent the themes and ideas from the transcript.

Write ONLY the scene description, no additional commentary.

Scene Description:`
}

const getCostPerSecond = (service: VideoGenServiceType, model: string): number => {
  const serviceConfig = VIDEO_CONFIG[service]
  if (!serviceConfig) return 0
  const modelConfig = serviceConfig.models.find(m => m.id === model)
  if (!modelConfig) return 0
  return modelConfig.costPerSecond || 0
}

const VIDEO_SERVICE_MAP = {
  gemini: runGeminiVideo,
  deepinfra: runDeepInfraVideo,
  minimax: runMinimaxVideo,
  grok: runGrokVideo,
  runway: runRunwayVideo,
  glm: runGlmVideo,
  deapi: runDeapiVideo
} as const

const VIDEO_FALLBACK_ORDER: VideoGenServiceType[] = ['gemini', 'minimax', 'runway', 'grok', 'deepinfra', 'glm', 'deapi']

const VIDEO_API_KEY_MAP: Record<VideoGenServiceType, string> = {
  gemini: 'GEMINI_API_KEY',
  runway: 'RUNWAYML_API_SECRET',
  deepinfra: 'DEEPINFRA_API_KEY',
  minimax: 'MINIMAX_API_KEY',
  grok: 'XAI_API_KEY',
  glm: 'GLM_API_KEY',
  deapi: 'DEAPI_API_KEY',
}

const hasRequiredVideoApiKey = (service: VideoGenServiceType): boolean => {
  return !!process.env[VIDEO_API_KEY_MAP[service]]
}

const getNextVideoService = (
  currentService: VideoGenServiceType,
  triedServices: Set<VideoGenServiceType>
): VideoGenServiceType | null => {
  for (const service of VIDEO_FALLBACK_ORDER) {
    if (service === currentService || triedServices.has(service)) continue
    if (hasRequiredVideoApiKey(service)) return service
  }
  return null
}

const clampDuration = (duration: number, service: VideoGenServiceType): number => {
  const config = VIDEO_CONFIG[service]
  if (!config?.durations?.length) return duration
  const sorted = [...config.durations].sort((a, b) => a - b)
  const closest = sorted.reduce((prev, curr) =>
    Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
  )
  return closest
}

const VIDEO_RETRY_TIMEOUT_MS = 10 * 60 * 1000

const DEFAULT_VIDEO_GENERATION_DEPENDENCIES: VideoGenerationDependencies = {
  runSceneLlm: runStructuredLLM,
  getVideoGenerator: (service) => VIDEO_SERVICE_MAP[service]
}

const recordLlmUsageTotals = (
  totals: {
    totalLlmCost: number
    totalLlmCostUsd: number
    totalLlmInputTokenCount: number
    totalLlmOutputTokenCount: number
    hasAnyLlmInputTokens: boolean
    hasAnyLlmOutputTokens: boolean
    hasAnyLlmCostUsd: boolean
  },
  metadata: {
    totalCost?: number | undefined
    actualCostUsd?: number | undefined
    inputTokenCount?: number | undefined
    outputTokenCount?: number | undefined
  }
): void => {
  if (metadata.totalCost != null) {
    totals.totalLlmCost += metadata.totalCost
  }
  if (metadata.actualCostUsd != null) {
    totals.totalLlmCostUsd += metadata.actualCostUsd
    totals.hasAnyLlmCostUsd = true
  }
  if (metadata.inputTokenCount != null) {
    totals.totalLlmInputTokenCount += metadata.inputTokenCount
    totals.hasAnyLlmInputTokens = true
  }
  if (metadata.outputTokenCount != null) {
    totals.totalLlmOutputTokenCount += metadata.outputTokenCount
    totals.hasAnyLlmOutputTokens = true
  }
}

const getResolvedVideoCost = (
  service: VideoGenServiceType,
  model: VideoModel,
  duration: number,
  videoResult: { actualCost?: number }
): number => {
  const costPerSecond = getCostPerSecond(service, model)
  return videoResult.actualCost ?? (duration * costPerSecond)
}

const validateVideoGenerationOptions = (options: ProcessingOptions): void => {
  if (!options.videoGenEnabled) {
    return
  }

  if (!options.selectedVideoPrompts || options.selectedVideoPrompts.length === 0) {
    return
  }

  if (!options.videoService) {
    throw new Error('Video service is required for video generation')
  }

  if (!options.videoModel || !options.videoSize || !options.videoDuration) {
    throw new Error('Video generation requires model, size, and duration')
  }
}

const resolveSceneLlmSelection = (options: ProcessingOptions): {
  service: StructuredOutputProvider
  model: string
} => {
  return {
    service: (options.llmEnabled && options.llmService
      ? options.llmService
      : DEFAULT_AUX_LLM.service) as StructuredOutputProvider,
    model: options.llmEnabled && options.llmModel
      ? options.llmModel
      : DEFAULT_AUX_LLM.model
  }
}

const generateVideos = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  selectedPrompts: VideoPromptType[],
  model: VideoModel,
  size: VideoSize,
  duration: number,
  customInstructions: string | undefined,
  outputDir: string,
  llmModel: string,
  progressTracker?: IProgressTracker,
  service: VideoGenServiceType = 'runway',
  aspectRatio?: string,
  llmService: StructuredOutputProvider = 'openai',
  jobId?: string,
  dependencies: VideoGenerationDependencies = DEFAULT_VIDEO_GENERATION_DEPENDENCIES
): Promise<{ results: VideoGenerationResult[], metadata: Step8Metadata }> => {
  const stepNumber = STEP_NUMBER


  const generateVideo = dependencies.getVideoGenerator(service)
  if (!generateVideo) {
    throw new Error(`Unknown video service: ${service}`)
  }

  const startTime = Date.now()
  const results: VideoGenerationResult[] = []
  const totalVideos = selectedPrompts.length
  const llmTotals = {
    totalLlmCost: 0,
    totalLlmCostUsd: 0,
    totalLlmInputTokenCount: 0,
    totalLlmOutputTokenCount: 0,
    hasAnyLlmInputTokens: false,
    hasAnyLlmOutputTokens: false,
    hasAnyLlmCostUsd: false
  }

  for (let i = 0; i < selectedPrompts.length; i++) {
    const videoType = selectedPrompts[i]
    if (!videoType) continue

    const videoIndex = i + 1
    const baseProgress = Math.floor((i / totalVideos) * 100)
    const progressPerVideo = Math.floor(100 / totalVideos)


    progressTracker?.updateStepWithSubStep(
      stepNumber,
      videoIndex,
      totalVideos,
      `Video ${videoIndex}/${totalVideos}`,
      `Generating scene description for ${videoType}`
    )

    const scenePrompt = buildVideoScenePrompt(
      metadata,
      transcription,
      videoType,
      size,
      duration,
      customInstructions
    )

    const scenePromptPath = `${outputDir}/video-scene-${videoType}.md`
    await Bun.write(scenePromptPath, scenePrompt)

    progressTracker?.updateStepProgress(
      stepNumber,
      baseProgress + Math.floor(progressPerVideo * 0.1),
      `Requesting scene description from LLM for ${videoType}`
    )

    const { response, metadata: llmMetadata } = await dependencies.runSceneLlm(
      llmService,
      scenePrompt,
      llmModel,
      ['text'],
      progressTracker
    )
    const sceneDescription = response.text ?? ''
    const sceneGenerationTime = llmMetadata.processingTime
    recordLlmUsageTotals(llmTotals, llmMetadata)


    const sceneDescriptionPath = `${outputDir}/video-scene-description-${videoType}.md`
    await Bun.write(sceneDescriptionPath, sceneDescription)

    progressTracker?.updateStepProgress(
      stepNumber,
      baseProgress + Math.floor(progressPerVideo * 0.2),
      `Starting ${getVideoServiceName(service)} render for ${videoType}`
    )

    const videoStartTime = Date.now()
    const videoErrors: Array<{ service: string, model: string, error: string }> = []
    const triedVideoServices = new Set<VideoGenServiceType>()
    let currentVideoService = service
    let currentVideoModel = model
    let currentVideoSize = size
    let currentVideoDuration = duration
    let currentAspectRatio = aspectRatio
    let videoAttemptNumber = 1
    let videoResult: Awaited<ReturnType<typeof generateVideo>>
    let resolvedVideoCost: number

    while (true) {
      if (Date.now() - videoStartTime > VIDEO_RETRY_TIMEOUT_MS) {
        throw new Error(`Video retry timeout for ${videoType} exceeded after ${Math.round((Date.now() - videoStartTime) / 1000)}s: ${videoErrors.map(e => `${e.service}/${e.model}: ${e.error}`).join('; ')}`)
      }

      const currentGenerator = dependencies.getVideoGenerator(currentVideoService)
      if (!currentGenerator || !hasRequiredVideoApiKey(currentVideoService)) {
        triedVideoServices.add(currentVideoService)
        const next = getNextVideoService(currentVideoService, triedVideoServices)
        if (!next) break
        l('[video-fallback] skipping service', { skipped: currentVideoService, next, reason: !currentGenerator ? 'no generator' : 'no API key' })
        currentVideoService = next
        currentVideoModel = getDefaultVideoModel(next) as VideoModel
        currentVideoSize = getDefaultVideoSize(next) as VideoSize
        currentVideoDuration = clampDuration(duration, next)
        currentAspectRatio = undefined
        videoAttemptNumber = 1
        continue
      }

      try {
        if (videoErrors.length > 0) {
          progressTracker?.updateStepProgress(
            stepNumber,
            baseProgress + Math.floor(progressPerVideo * 0.2),
            `Retry ${videoErrors.length + 1}: trying ${getVideoServiceName(currentVideoService)} for ${videoType}`
          )
        }

        videoResult = await currentGenerator(
          sceneDescription,
          currentVideoModel,
          currentVideoSize,
          currentVideoDuration,
          outputDir,
          videoType,
          progressTracker,
          stepNumber,
          baseProgress + Math.floor(progressPerVideo * 0.2),
          baseProgress + Math.floor(progressPerVideo * 0.95),
          currentAspectRatio,
          jobId
        )

        resolvedVideoCost = getResolvedVideoCost(currentVideoService, currentVideoModel, currentVideoDuration, videoResult as { actualCost?: number })

        if (videoErrors.length > 0) {
          l('[video-fallback] succeeded after retries', { service: currentVideoService, model: currentVideoModel, videoType, attempts: videoErrors.length + 1 })
        }
        break
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        videoErrors.push({ service: currentVideoService, model: currentVideoModel as string, error: errorMessage })
        l('[video-fallback] attempt failed', { service: currentVideoService, model: currentVideoModel, videoType, attempt: videoAttemptNumber, error: errorMessage })

        if (videoAttemptNumber === 1) {
          videoAttemptNumber = 2
        } else {
          triedVideoServices.add(currentVideoService)
          const next = getNextVideoService(currentVideoService, triedVideoServices)
          if (next) {
            l('[video-fallback] falling back to next service', { from: currentVideoService, to: next, videoType })
            currentVideoService = next
            currentVideoModel = getDefaultVideoModel(next) as VideoModel
            currentVideoSize = getDefaultVideoSize(next) as VideoSize
            currentVideoDuration = clampDuration(duration, next)
            currentAspectRatio = undefined
            videoAttemptNumber = 1
          } else {
            break
          }
        }
      }
    }

    if (!videoResult!) {
      throw new Error(`All video attempts failed for ${videoType}: ${videoErrors.map(e => `${e.service}/${e.model}: ${e.error}`).join('; ')}`)
    }

    const videoGenerationTime = Date.now() - videoStartTime

    const videoFileName = videoResult.videoPath.split('/').pop() || `video_${videoType}.mp4`
    const thumbnailFileName = videoResult.thumbnailPath ? videoResult.thumbnailPath.split('/').pop() : undefined

    results.push({
      promptType: videoType,
      fileName: videoFileName,
      fileSize: videoResult.fileSize,
      processingTime: videoGenerationTime + sceneGenerationTime,
      duration: currentVideoDuration,
      size: currentVideoSize,
      cost: resolvedVideoCost!,
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
  const renderCost = results.reduce((sum, result) => sum + result.cost, 0)
  const totalCost = renderCost + llmTotals.totalLlmCost

  const step8Metadata: Step8Metadata = {
    videoGenService: service,
    videoGenModel: model,
    processingTime: totalProcessingTime,
    videosGenerated: results.length,
    selectedPrompts,
    selectedSize: size,
    selectedDuration: duration,
    totalCost,
    actualCostUsd: totalCost,
    ...(llmTotals.hasAnyLlmInputTokens && { llmInputTokenCount: llmTotals.totalLlmInputTokenCount }),
    ...(llmTotals.hasAnyLlmOutputTokens && { llmOutputTokenCount: llmTotals.totalLlmOutputTokenCount }),
    ...(llmTotals.totalLlmCost > 0 && { llmCost: llmTotals.totalLlmCost }),
    ...(llmTotals.hasAnyLlmCostUsd && { llmCostUsd: llmTotals.totalLlmCostUsd }),
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
  jobId?: string,
  dependencies: VideoGenerationDependencies = DEFAULT_VIDEO_GENERATION_DEPENDENCIES
) => {

  if (!options.videoGenEnabled) {
    return undefined
  }

  if (!options.selectedVideoPrompts || options.selectedVideoPrompts.length === 0) {
    return undefined
  }

  validateVideoGenerationOptions(options)

  const videoModel = options.videoModel!
  const videoSize = options.videoSize!
  const videoDuration = options.videoDuration!
  const videoService = options.videoService as VideoGenServiceType

  progressTracker.startStep(STEP_NUMBER, 'Starting video generation')
  const auxLlm = resolveSceneLlmSelection(options)

  const videoResult = await generateVideos(
    metadata,
    transcription,
    options.selectedVideoPrompts,
    videoModel,
    videoSize,
    videoDuration,
    options.videoCustomInstructions,
    options.outputDir,
    auxLlm.model,
    progressTracker,
    videoService,
    options.videoAspectRatio,
    auxLlm.service,
    jobId,
    dependencies
  )

  return videoResult.metadata
}

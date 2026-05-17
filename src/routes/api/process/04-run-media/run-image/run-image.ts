import { IMAGE_CONFIG,getDefaultImageModelForService } from '~/models/models-config/image-config'
import { createRecoverableAttemptProgressTracker } from '~/routes/api/process/shared/recoverable-progress-tracker'
import type { IProgressTracker,ImageGenServiceType,ImageGenerationResult,ProcessingOptions,Step6Metadata,VideoMetadata } from '~/types'
import { l } from '~/utils/logger/logging'
import { STEP_NUMBER } from './image-services/image-helpers'
import { runDeapiImage } from './image-services/run-deapi-image'
import { runDeepInfraImage } from './image-services/run-deepinfra-image'
import { runFluxImage } from './image-services/run-flux-image'
import { runGeminiImage } from './image-services/run-gemini-image'
import { runGlmImage } from './image-services/run-glm-image'
import { runGrokImage } from './image-services/run-grok-image'
import { runMinimaxImage } from './image-services/run-minimax-image'
import { runOpenAIImage } from './image-services/run-openai-image'
import { runRunwayImage } from './image-services/run-runway-image'

const IMAGE_FALLBACK_ORDER: ImageGenServiceType[] = ['gemini', 'openai', 'minimax', 'grok', 'deepinfra', 'flux', 'glm', 'runway', 'deapi']

const IMAGE_API_KEY_MAP: Record<ImageGenServiceType, string> = {
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  minimax: 'MINIMAX_API_KEY',
  grok: 'XAI_API_KEY',
  runway: 'RUNWAYML_API_SECRET',
  deepinfra: 'DEEPINFRA_API_KEY',
  deapi: 'DEAPI_API_KEY',
  flux: 'BFL_API_KEY',
  glm: 'GLM_API_KEY',
}

const hasRequiredImageApiKey = (service: ImageGenServiceType): boolean => {
  return !!process.env[IMAGE_API_KEY_MAP[service]]
}

const getNextImageService = (
  currentService: ImageGenServiceType,
  triedServices: Set<ImageGenServiceType>
): ImageGenServiceType | null => {
  for (const service of IMAGE_FALLBACK_ORDER) {
    if (service === currentService || triedServices.has(service)) continue
    if (hasRequiredImageApiKey(service)) return service
  }
  return null
}

const getDefaultDimensionOrRatio = (service: ImageGenServiceType): string => {
  const config = IMAGE_CONFIG[service]
  if (config.dimensions && config.dimensions.length > 0) return config.dimensions[0]!.id
  if (config.aspectRatios && config.aspectRatios.length > 0) return config.aspectRatios[0]!
  return '1:1'
}

const IMAGE_RETRY_TIMEOUT_MS = 5 * 60 * 1000

const generateImages = async (
  title: string,
  textOutput: string,
  selectedPrompts: string[],
  customInstructions: string | undefined,
  outputDir: string,
  service: ImageGenServiceType,
  model: string,
  dimensionOrRatio: string,
  progressTracker?: IProgressTracker,
  jobId?: string
): Promise<{ results: ImageGenerationResult[], metadata: Step6Metadata }> => {

  progressTracker?.updateStepProgress(STEP_NUMBER, 10, 'Starting image generation with ' + service)

  const generators: Record<ImageGenServiceType, typeof runOpenAIImage> = {
    openai: runOpenAIImage,
    gemini: runGeminiImage,
    minimax: runMinimaxImage,
    grok: runGrokImage,
    runway: runRunwayImage,
    deepinfra: runDeepInfraImage,
    deapi: runDeapiImage,
    flux: runFluxImage,
    glm: runGlmImage
  }

  const generator = generators[service]
  if (!generator) {
    const errorMsg = `Unknown image generation service: ${service}`
    progressTracker?.error(STEP_NUMBER, 'Configuration error', errorMsg)
    throw new Error(errorMsg)
  }

  const result = await generator(
    title,
    textOutput,
    selectedPrompts,
    customInstructions,
    outputDir,
    model,
    dimensionOrRatio,
    progressTracker,
    jobId
  )

  progressTracker?.completeStep(STEP_NUMBER, 'Image generation complete')

  return result
}

export const processImageGeneration = async (
  metadata: VideoMetadata,
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  jobId?: string
) => {

  if (!options.imageGenEnabled) {
    return undefined
  }

  if (!options.selectedImagePrompts || options.selectedImagePrompts.length === 0) {
    return undefined
  }

  if (!options.imageService || !options.imageModel || !options.imageDimensionOrRatio) {
    throw new Error('Image generation requires image service, model, and dimension/ratio')
  }

  const stepNumber = STEP_NUMBER
  progressTracker.startStep(stepNumber, 'Starting image generation')

  const transcriptPath = `${options.outputDir}/transcription.txt`
  const summaryText = await Bun.file(transcriptPath).text()

  const imageService = options.imageService as ImageGenServiceType
  const imageModel = options.imageModel
  const imageDimensionOrRatio = options.imageDimensionOrRatio

  const errors: Array<{ service: string, model: string, error: string }> = []
  const triedServices = new Set<ImageGenServiceType>()
  const retryStartTime = Date.now()
  let currentService = imageService
  let currentModel = imageModel
  let currentDimensionOrRatio = imageDimensionOrRatio
  let attemptNumber = 1

  while (true) {
    if (Date.now() - retryStartTime > IMAGE_RETRY_TIMEOUT_MS) {
      throw new Error(`Image retry timeout exceeded after ${Math.round((Date.now() - retryStartTime) / 1000)}s: ${errors.map(e => `${e.service}/${e.model}: ${e.error}`).join('; ')}`)
    }

    if (!hasRequiredImageApiKey(currentService)) {
      triedServices.add(currentService)
      const next = getNextImageService(currentService, triedServices)
      if (!next) break
      l('[image-fallback] skipping service (no API key)', { skipped: currentService, next })
      currentService = next
      currentModel = getDefaultImageModelForService(next)
      currentDimensionOrRatio = getDefaultDimensionOrRatio(next)
      attemptNumber = 1
      continue
    }

    try {
      if (errors.length > 0) {
        progressTracker.updateStepProgress(STEP_NUMBER, 10, `Retry ${errors.length + 1}: trying ${currentService}/${currentModel}`)
      }

      const attemptProgressTracker = createRecoverableAttemptProgressTracker(progressTracker, {
        fallbackMessage: 'Trying another image generation provider'
      })
      const imageGenResult = await generateImages(
        metadata.title,
        summaryText,
        options.selectedImagePrompts,
        options.imageCustomInstructions,
        options.outputDir,
        currentService,
        currentModel,
        currentDimensionOrRatio,
        attemptProgressTracker,
        jobId
      )

      if (errors.length > 0) {
        l('[image-fallback] succeeded after retries', { service: currentService, model: currentModel, attempts: errors.length + 1 })
      }

      return imageGenResult.metadata
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ service: currentService, model: currentModel, error: errorMessage })
      l('[image-fallback] attempt failed', { service: currentService, model: currentModel, attempt: attemptNumber, error: errorMessage })

      if (attemptNumber === 1) {
        attemptNumber = 2
      } else {
        triedServices.add(currentService)
        const next = getNextImageService(currentService, triedServices)
        if (next) {
          l('[image-fallback] falling back to next service', { from: currentService, to: next })
          currentService = next
          currentModel = getDefaultImageModelForService(next)
          currentDimensionOrRatio = getDefaultDimensionOrRatio(next)
          attemptNumber = 1
        } else {
          break
        }
      }
    }
  }

  throw new Error(`All image attempts failed: ${errors.map(e => `${e.service}/${e.model}: ${e.error}`).join('; ')}`)
}

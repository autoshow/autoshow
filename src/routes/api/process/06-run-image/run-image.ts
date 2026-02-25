import type { Step6Metadata, ImageGenerationResult, IProgressTracker, ImageGenServiceType, VideoMetadata, ProcessingOptions } from '~/types'
import { l, err } from '~/utils/logging'
import { runOpenAIImage } from './image-services/run-openai-image'
import { runGeminiImage } from './image-services/run-gemini-image'
import { runMinimaxImage } from './image-services/run-minimax-image'
import { runGrokImage } from './image-services/run-grok-image'


export const generateImages = async (
  title: string,
  textOutput: string,
  selectedPrompts: string[],
  outputDir: string,
  service: ImageGenServiceType,
  model: string,
  dimensionOrRatio: string,
  progressTracker?: IProgressTracker,
  jobId?: string
): Promise<{ results: ImageGenerationResult[], metadata: Step6Metadata }> => {
  l('Step 6: Generate AI Images', {
    service,
    model,
    dimensionOrRatio,
    promptCount: selectedPrompts.length,
    prompts: selectedPrompts
  })

  progressTracker?.updateStepProgress(6, 10, 'Starting image generation with ' + service)

  const generators: Record<ImageGenServiceType, typeof runOpenAIImage> = {
    openai: runOpenAIImage,
    gemini: runGeminiImage,
    minimax: runMinimaxImage,
    grok: runGrokImage
  }

  const generator = generators[service]
  if (!generator) {
    const errorMsg = `Unknown image generation service: ${service}`
    err(errorMsg)
    progressTracker?.error(6, 'Configuration error', errorMsg)
    throw new Error(errorMsg)
  }

  const result = await generator(title, textOutput, selectedPrompts, outputDir, model, dimensionOrRatio, progressTracker, jobId)

  progressTracker?.completeStep(6, 'Image generation complete')

  return result
}

export const processImageGeneration = async (
  metadata: VideoMetadata,
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  jobId?: string
) => {
  l('Step 6: Image Generation', {
    imageGenEnabled: options.imageGenEnabled,
    selectedImagePrompts: options.selectedImagePrompts
  })

  if (!options.imageGenEnabled) {
    return undefined
  }

  if (!options.selectedImagePrompts || options.selectedImagePrompts.length === 0) {
    l('Image generation skipped', { reason: 'no prompts selected' })
    return undefined
  }

  if (!options.imageService || !options.imageModel || !options.imageDimensionOrRatio) {
    err('Image generation requires image service, model, and dimension/ratio')
    throw new Error('Image generation requires image service, model, and dimension/ratio')
  }

  const stepNumber = options.ttsEnabled ? 6 : 5
  progressTracker.startStep(stepNumber, 'Starting image generation')

  const transcriptPath = `${options.outputDir}/transcription.txt`
  const summaryText = await Bun.file(transcriptPath).text()

  const imageService = options.imageService as ImageGenServiceType
  const imageModel = options.imageModel
  const imageDimensionOrRatio = options.imageDimensionOrRatio

  const imageGenResult = await generateImages(
    metadata.title,
    summaryText,
    options.selectedImagePrompts,
    options.outputDir,
    imageService,
    imageModel,
    imageDimensionOrRatio,
    progressTracker,
    jobId
  )

  l('Image generation completed', {
    imagesGenerated: imageGenResult.metadata.imagesGenerated,
    selectedPrompts: options.selectedImagePrompts,
    service: imageService,
    model: imageModel,
    totalCost: `$${imageGenResult.metadata.totalCost.toFixed(4)}`
  })

  return imageGenResult.metadata
}

import { IMAGE_CONFIG } from '~/models/models-config/image-config'
import { IMAGE_PROMPT_CONFIG } from '~/prompts/image-prompts'
import type { ImageGenerationResult,ImageGenServiceType,IProgressTracker,SourceRoutesApiProcess04RunMediaRunImageImageServicesImageHelpersSingleImageResult as SingleImageResult,Step6Metadata } from '~/types'
import { uploadToS3 } from '~/utils/s3-utils'
export { requireEnvKey } from '~/utils/env'

export const STEP_NUMBER = 6

const buildPrompt = (
  promptType: string,
  title: string,
  textOutput: string,
  customInstructions?: string
): string | null => {
  const promptConfig = IMAGE_PROMPT_CONFIG[promptType as keyof typeof IMAGE_PROMPT_CONFIG]
  if (!promptConfig) {
    return null
  }
  const basePrompt = promptConfig.template.replace('{title}', title).replace('{textOutput}', textOutput)
  const trimmedCustomInstructions = customInstructions?.trim()
  return trimmedCustomInstructions
    ? `${basePrompt}\n\nAdditional user instructions:\n${trimmedCustomInstructions}`
    : basePrompt
}

export const getCostPerImage = (service: ImageGenServiceType, model: string, dimensionOrRatio?: string): number => {
  const serviceConfig = IMAGE_CONFIG[service]
  if (!serviceConfig) return 0

  const modelConfig = serviceConfig.models.find(m => m.id === model)
  if (!modelConfig) return 0

  const costPerImage = modelConfig.costPerImage
  if (typeof costPerImage === 'number') {
    return costPerImage
  }

  if (typeof costPerImage === 'object' && dimensionOrRatio) {
    return costPerImage[dimensionOrRatio] || 0
  }

  return 0
}

const buildImageMetadata = (
  service: ImageGenServiceType,
  model: string,
  startTime: number,
  results: ImageGenerationResult[],
  selectedPrompts: string[]
): Step6Metadata => {
  const totalCost = results.reduce((sum, result) => sum + (result.actualCost ?? result.cost), 0)

  return {
    imageGenService: service,
    imageGenModel: model,
    processingTime: Date.now() - startTime,
    imagesGenerated: results.length,
    totalCost,
    actualCostUsd: totalCost,
    selectedPrompts,
    results
  }
}

const handleImageError = (
  error: unknown,
  _serviceName: string,
  progressTracker?: IProgressTracker
): never => {
  progressTracker?.error(STEP_NUMBER, 'Image generation failed', error instanceof Error ? error.message : 'Unknown error')
  throw error
}

const saveImageAndBuildResult = async (
  base64Data: string,
  outputDir: string,
  promptType: string,
  processingTime: number,
  cost: number,
  revisedPrompt?: string,
  jobId?: string,
  actualCost?: number
): Promise<ImageGenerationResult> => {
  const fileName = `image_${promptType}.png`
  const filePath = `${outputDir}/${fileName}`
  const buffer = Buffer.from(base64Data, 'base64')
  await Bun.write(filePath, buffer)

  let s3Url: string | undefined
  if (jobId) {
    const s3Result = await uploadToS3(filePath, jobId, 'images')
    s3Url = s3Result?.s3Url
  }

  return {
    promptType,
    fileName,
    fileSize: buffer.length,
    processingTime,
    cost,
    ...(actualCost != null && { actualCost }),
    revisedPrompt,
    s3Url
  }
}

export const runImageGenerationLoop = async (config: {
  service: ImageGenServiceType
  displayName: string
  model: string
  startTime: number
  title: string
  textOutput: string
  selectedPrompts: string[]
  customInstructions?: string | undefined
  outputDir: string
  progressTracker?: IProgressTracker | undefined
  jobId?: string | undefined
  generateImage: (prompt: string, promptType: string) => Promise<SingleImageResult>
}): Promise<{ results: ImageGenerationResult[], metadata: Step6Metadata }> => {
  const results: ImageGenerationResult[] = []

  try {
    for (let i = 0; i < config.selectedPrompts.length; i++) {
      const promptType = config.selectedPrompts[i]
      if (!promptType) continue

      const prompt = buildPrompt(promptType, config.title, config.textOutput, config.customInstructions)
      if (!prompt) continue

      const promptIndex = i + 1
      config.progressTracker?.updateStepWithSubStep(
        STEP_NUMBER,
        promptIndex,
        config.selectedPrompts.length,
        `Image ${promptIndex}/${config.selectedPrompts.length}`,
        `Generating ${promptType} image with ${config.displayName}`
      )

      const imageStartTime = Date.now()
      const imageResult = await config.generateImage(prompt, promptType)
      if (!imageResult) continue

      const result = await saveImageAndBuildResult(
        imageResult.base64,
        config.outputDir,
        promptType,
        Date.now() - imageStartTime,
        imageResult.cost,
        imageResult.revisedPrompt,
        config.jobId,
        imageResult.actualCost
      )
      results.push(result)
    }

    const metadata = buildImageMetadata(config.service, config.model, config.startTime, results, config.selectedPrompts)
    return { results, metadata }
  } catch (error) {
    return handleImageError(error, config.displayName, config.progressTracker)
  }
}

import type { Step6Metadata, ImageGenerationResult, IProgressTracker, ImageGenServiceType } from '~/types'
import { l, err } from '~/utils/logging'
import { IMAGE_PROMPT_CONFIG } from '~/prompts/image-prompts'
import { uploadToS3 } from '~/utils/s3-upload'
import { IMAGE_CONFIG } from '~/models/image-config'
export { requireEnvKey } from '~/utils/env'

const STEP_NUMBER = 6

export const buildPrompt = (promptType: string, title: string, textOutput: string): string | null => {
  const promptConfig = IMAGE_PROMPT_CONFIG[promptType as keyof typeof IMAGE_PROMPT_CONFIG]
  if (!promptConfig) {
    l('Unknown prompt type', { promptType })
    return null
  }
  return promptConfig.template.replace('{title}', title).replace('{textOutput}', textOutput)
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

export const buildImageMetadata = (
  service: ImageGenServiceType,
  model: string,
  startTime: number,
  results: ImageGenerationResult[],
  selectedPrompts: string[]
): Step6Metadata => {
  const totalCost = results.reduce((sum, result) => sum + result.cost, 0)
  return {
    imageGenService: service,
    imageGenModel: model,
    processingTime: Date.now() - startTime,
    imagesGenerated: results.length,
    totalCost,
    selectedPrompts,
    results
  }
}

export const handleImageError = (
  error: unknown,
  serviceName: string,
  progressTracker?: IProgressTracker
): never => {
  err(`${serviceName} image generation failed`, error)
  progressTracker?.error(STEP_NUMBER, 'Image generation failed', error instanceof Error ? error.message : 'Unknown error')
  throw error
}

export const saveImageAndBuildResult = async (
  base64Data: string,
  outputDir: string,
  promptType: string,
  processingTime: number,
  cost: number,
  revisedPrompt?: string,
  jobId?: string
): Promise<ImageGenerationResult> => {
  const fileName = `image_${promptType}.png`
  const filePath = `${outputDir}/${fileName}`
  const buffer = Buffer.from(base64Data, 'base64')
  await Bun.write(filePath, buffer)
  l('Image created', { fileName, size: `${(buffer.length / 1024).toFixed(0)} KB`, cost: `$${cost.toFixed(4)}` })

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
    revisedPrompt,
    s3Url
  }
}

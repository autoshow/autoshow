import OpenAI from 'openai'
import type { Step6Metadata, ImageGenerationResult, IProgressTracker } from '~/types'
import { l } from '~/utils/logging'
import {
  requireEnvKey,
  buildPrompt,
  buildImageMetadata,
  handleImageError,
  saveImageAndBuildResult,
  getCostPerImage
} from './image-helpers'

const SERVICE_NAME = 'Grok'
const STEP_NUMBER = 6

export const runGrokImage = async (
  title: string,
  textOutput: string,
  selectedPrompts: string[],
  outputDir: string,
  model: string,
  dimensionOrRatio: string,
  progressTracker?: IProgressTracker,
  jobId?: string
): Promise<{ results: ImageGenerationResult[], metadata: Step6Metadata }> => {
  const apiKey = requireEnvKey('XAI_API_KEY')
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1'
  })
  const startTime = Date.now()

  l(`Starting ${SERVICE_NAME} image generation`, { model, aspectRatio: dimensionOrRatio })

  const results: ImageGenerationResult[] = []

  try {
    for (let i = 0; i < selectedPrompts.length; i++) {
      const promptType = selectedPrompts[i]
      if (!promptType) continue

      const prompt = buildPrompt(promptType, title, textOutput)
      if (!prompt) continue

      const promptIndex = i + 1
      progressTracker?.updateStepWithSubStep(
        STEP_NUMBER,
        promptIndex,
        selectedPrompts.length,
        `Image ${promptIndex}/${selectedPrompts.length}`,
        `Generating ${promptType} image with ${SERVICE_NAME}`
      )
      l('Generating image', { index: `${promptIndex}/${selectedPrompts.length}`, promptType })

      const imageStartTime = Date.now()

      const response = await client.images.generate({
        model,
        prompt,
        aspect_ratio: dimensionOrRatio,
        response_format: 'b64_json'
      } as any)

      l(`${SERVICE_NAME} API response received`, { time: `${Date.now() - imageStartTime}ms` })

      if (!response.data || response.data.length === 0) {
        l('No image data received', { promptType })
        continue
      }

      const imageData = response.data[0]
      if (!imageData?.b64_json) {
        l('No base64 data in response', { promptType })
        continue
      }

      const cost = getCostPerImage('grok', model)
      const result = await saveImageAndBuildResult(
        imageData.b64_json,
        outputDir,
        promptType,
        Date.now() - imageStartTime,
        cost,
        imageData.revised_prompt,
        jobId
      )
      results.push(result)
    }

    const metadata = buildImageMetadata('grok', model, startTime, results, selectedPrompts)
    l(`${SERVICE_NAME} image generation completed`, {
      totalTime: `${(metadata.processingTime / 1000).toFixed(1)}s`,
      imagesGenerated: results.length,
      totalCost: `$${metadata.totalCost.toFixed(4)}`
    })

    return { results, metadata }
  } catch (error) {
    return handleImageError(error, SERVICE_NAME, progressTracker)
  }
}

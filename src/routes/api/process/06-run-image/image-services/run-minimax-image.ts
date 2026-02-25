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

const SERVICE_NAME = 'MiniMax'
const STEP_NUMBER = 6
const API_URL = 'https://api.minimax.io/v1/image_generation'
const VALID_ASPECT_RATIOS = ['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9']

export const runMinimaxImage = async (
  title: string,
  textOutput: string,
  selectedPrompts: string[],
  outputDir: string,
  model: string,
  dimensionOrRatio: string,
  progressTracker?: IProgressTracker,
  jobId?: string
): Promise<{ results: ImageGenerationResult[], metadata: Step6Metadata }> => {
  const apiKey = requireEnvKey('MINIMAX_API_KEY')
  const startTime = Date.now()

  l(`Starting ${SERVICE_NAME} image generation`, { model, aspectRatio: dimensionOrRatio })

  const aspectRatio = VALID_ASPECT_RATIOS.includes(dimensionOrRatio) ? dimensionOrRatio : '1:1'
  if (!VALID_ASPECT_RATIOS.includes(dimensionOrRatio)) {
    l('Invalid aspect ratio, defaulting to 1:1', { requested: dimensionOrRatio, valid: VALID_ASPECT_RATIOS })
  }

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
      l('Generating image', { index: `${promptIndex}/${selectedPrompts.length}`, promptType, model })

      const imageStartTime = Date.now()

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt,
          aspect_ratio: aspectRatio,
          response_format: 'base64'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`MiniMax API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json() as { data?: { image_base64?: string[] } }

      l(`${SERVICE_NAME} API response received`, { time: `${Date.now() - imageStartTime}ms` })

      const imageBase64 = data.data?.image_base64?.[0]
      if (!imageBase64) {
        l('No image data in response', { promptType })
        continue
      }

      const cost = getCostPerImage('minimax', model)
      const result = await saveImageAndBuildResult(
        imageBase64,
        outputDir,
        promptType,
        Date.now() - imageStartTime,
        cost,
        undefined,
        jobId
      )
      results.push(result)
    }

    const metadata = buildImageMetadata('minimax', model, startTime, results, selectedPrompts)
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

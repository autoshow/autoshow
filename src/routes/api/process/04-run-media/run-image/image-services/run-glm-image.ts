import type { ImageGenerationResult,IProgressTracker,Step6Metadata } from '~/types'
import { callOpenAICompatibleImageGeneration } from '~/routes/api/process/shared/openai-compatible'
import { getCostPerImage,requireEnvKey,runImageGenerationLoop } from './image-helpers'

const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']
const GLM_DOWNLOAD_MAX_ATTEMPTS = 6
const GLM_DOWNLOAD_RETRYABLE_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504])

const getGlmDimensions = (aspectRatio: string): string => {
  const dimensionMap: Record<string, string> = {
    '1:1': '1280x1280',
    '16:9': '1728x960',
    '9:16': '960x1728',
    '4:3': '1568x1056',
    '3:4': '1056x1568'
  }
  return dimensionMap[aspectRatio] || '1280x1280'
}

const downloadGlmImage = async (imageUrl: string): Promise<string> => {
  let lastStatus: number | undefined

  for (let attempt = 1; attempt <= GLM_DOWNLOAD_MAX_ATTEMPTS; attempt++) {
    const imageResponse = await fetch(imageUrl)
    if (imageResponse.ok) {
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      return imageBuffer.toString('base64')
    }

    lastStatus = imageResponse.status
    if (!GLM_DOWNLOAD_RETRYABLE_STATUSES.has(imageResponse.status) || attempt === GLM_DOWNLOAD_MAX_ATTEMPTS) {
      throw new Error(`Failed to download image: ${imageResponse.status}`)
    }

    const retryDelayMs = attempt * 1000
    await Bun.sleep(retryDelayMs)
  }

  throw new Error(`Failed to download image: ${lastStatus ?? 'unknown'}`)
}

export const runGlmImage = async (
  title: string,
  textOutput: string,
  selectedPrompts: string[],
  customInstructions: string | undefined,
  outputDir: string,
  model: string,
  dimensionOrRatio: string,
  progressTracker?: IProgressTracker,
  jobId?: string
): Promise<{ results: ImageGenerationResult[], metadata: Step6Metadata }> => {
  const apiKey = requireEnvKey('GLM_API_KEY')
  const aspectRatio = VALID_ASPECT_RATIOS.includes(dimensionOrRatio) ? dimensionOrRatio : '1:1'
  if (!VALID_ASPECT_RATIOS.includes(dimensionOrRatio)) {
  }
  const size = getGlmDimensions(aspectRatio)

  return runImageGenerationLoop({
    service: 'glm', displayName: 'GLM', model, startTime: Date.now(),
    title, textOutput, selectedPrompts, customInstructions, outputDir, progressTracker, jobId,
    generateImage: async (prompt) => {
      const response = await callOpenAICompatibleImageGeneration('glm', apiKey, {
        model, prompt, size
      })
      const imageUrl = response.data?.[0]?.url
      if (!imageUrl) return null

      const imageBase64 = await downloadGlmImage(imageUrl)
      return { base64: imageBase64, cost: getCostPerImage('glm', model) }
    }
  })
}

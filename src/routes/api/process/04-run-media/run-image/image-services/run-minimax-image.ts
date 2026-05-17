import type { ImageGenerationResult,IProgressTracker,Step6Metadata } from '~/types'
import { getCostPerImage,requireEnvKey,runImageGenerationLoop } from './image-helpers'

const API_URL = 'https://api.minimax.io/v1/image_generation'
const VALID_ASPECT_RATIOS = ['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9']

export const runMinimaxImage = async (
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
  const apiKey = requireEnvKey('MINIMAX_API_KEY')
  const aspectRatio = VALID_ASPECT_RATIOS.includes(dimensionOrRatio) ? dimensionOrRatio : '1:1'
  if (!VALID_ASPECT_RATIOS.includes(dimensionOrRatio)) {
  }

  return runImageGenerationLoop({
    service: 'minimax', displayName: 'MiniMax', model, startTime: Date.now(),
    title, textOutput, selectedPrompts, customInstructions, outputDir, progressTracker, jobId,
    generateImage: async (prompt) => {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, aspect_ratio: aspectRatio, response_format: 'base64' })
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`MiniMax API error: ${response.status} - ${errorText}`)
      }
      const data = await response.json() as { data?: { image_base64?: string[] } }
      const imageBase64 = data.data?.image_base64?.[0]
      if (!imageBase64) return null
      return { base64: imageBase64, cost: getCostPerImage('minimax', model) }
    }
  })
}

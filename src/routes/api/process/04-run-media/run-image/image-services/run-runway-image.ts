import type { ImageGenerationResult,IProgressTracker,Step6Metadata } from '~/types'
import { getCostPerImage,requireEnvKey,runImageGenerationLoop } from './image-helpers'

const BASE_URL = 'https://api.dev.runwayml.com'
const RUNWAY_VERSION = '2024-11-06'
const PROMPT_LIMIT = 1000
const MAX_POLL_ATTEMPTS = 120
const POLL_INTERVAL_MS = 5000

const mapToRunwayRatio = (ratio: string): string => {
  const ratioMap: Record<string, string> = {
    '1:1': '1024:1024',
    '16:9': '1280:720',
    '9:16': '720:1280',
    '4:3': '1152:864'
  }
  return ratioMap[ratio] || ratioMap['1:1']!
}

const downloadImageAsBase64 = async (imageUrl: string): Promise<string> => {
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`)
  return Buffer.from(await response.arrayBuffer()).toString('base64')
}

const trimRunwayImagePromptToLimit = (prompt: string): string => {
  if (prompt.length <= PROMPT_LIMIT) return prompt
  const trimmed = prompt.slice(0, PROMPT_LIMIT)
  return trimmed
}

export const runRunwayImage = async (
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
  const apiKey = requireEnvKey('RUNWAYML_API_SECRET')

  return runImageGenerationLoop({
    service: 'runway', displayName: 'Runway', model, startTime: Date.now(),
    title, textOutput, selectedPrompts, customInstructions, outputDir, progressTracker, jobId,
    generateImage: async (prompt) => {
      const promptText = trimRunwayImagePromptToLimit(prompt)
      const createResponse = await fetch(`${BASE_URL}/v1/text_to_image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Runway-Version': RUNWAY_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, promptText, ratio: mapToRunwayRatio(dimensionOrRatio) })
      })
      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        throw new Error(`Runway image creation failed: ${createResponse.status} - ${errorText}`)
      }

      const task = await createResponse.json() as { id?: string }
      if (!task.id) throw new Error('Runway image creation response missing task id')

      let imageUrl: string | undefined
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        const statusResponse = await fetch(`${BASE_URL}/v1/tasks/${task.id}`, {
          headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Runway-Version': RUNWAY_VERSION }
        })
        if (!statusResponse.ok) {
          const errorText = await statusResponse.text()
          throw new Error(`Runway image status failed: ${statusResponse.status} - ${errorText}`)
        }
        const data = await statusResponse.json() as { status?: string, output?: string[], error?: { message?: string } }
        if (data.status === 'SUCCEEDED') { imageUrl = data.output?.[0]; break }
        if (data.status === 'FAILED' || data.status === 'CANCELED' || data.status === 'CANCELLED') {
          throw new Error(data.error?.message || `Runway image task failed with status: ${data.status}`)
        }
        await Bun.sleep(POLL_INTERVAL_MS)
      }

      if (!imageUrl) throw new Error('Runway image generation timed out')

      const imageBase64 = await downloadImageAsBase64(imageUrl)
      return { base64: imageBase64, cost: getCostPerImage('runway', model, dimensionOrRatio) }
    }
  })
}

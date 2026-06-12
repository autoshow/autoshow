import type { SourceRoutesApiProcess04RunMediaRunImageImageServicesRunFluxImageAspectRatioDimensions as AspectRatioDimensions,SourceRoutesApiProcess04RunMediaRunImageImageServicesRunFluxImageFluxPollResponse as FluxPollResponse,SourceRoutesApiProcess04RunMediaRunImageImageServicesRunFluxImageFluxSubmitResponse as FluxSubmitResponse,ImageGenerationResult,IProgressTracker,Step6Metadata } from '~/types'
import { getCostPerImage,requireEnvKey,runImageGenerationLoop } from './image-helpers'

const API_BASE_URL = 'https://api.bfl.ai/v1'
const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']
const POLL_INTERVAL_MS = 500
const MAX_POLL_ATTEMPTS = 120

const getAspectRatioDimensions = (aspectRatio: string): AspectRatioDimensions => {
  const dimensionMap: Record<string, AspectRatioDimensions> = {
    '1:1': { width: 1024, height: 1024 },
    '16:9': { width: 1920, height: 1088 },
    '9:16': { width: 1088, height: 1920 },
    '4:3': { width: 1408, height: 1056 },
    '3:4': { width: 1056, height: 1408 }
  }
  return dimensionMap[aspectRatio] || dimensionMap['1:1']!
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const runFluxImage = async (
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
  const apiKey = requireEnvKey('BFL_API_KEY')
  const aspectRatio = VALID_ASPECT_RATIOS.includes(dimensionOrRatio) ? dimensionOrRatio : '1:1'
  if (!VALID_ASPECT_RATIOS.includes(dimensionOrRatio)) {
  }
  const { width, height } = getAspectRatioDimensions(aspectRatio)

  return runImageGenerationLoop({
    service: 'flux', displayName: 'Flux', model, startTime: Date.now(),
    title, textOutput, selectedPrompts, customInstructions, outputDir, progressTracker, jobId,
    generateImage: async (prompt) => {
      const submitResponse = await fetch(`${API_BASE_URL}/${model}`, {
        method: 'POST',
        headers: { 'x-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width, height, output_format: 'jpeg' })
      })
      if (!submitResponse.ok) {
        const errorText = await submitResponse.text()
        throw new Error(`Flux API submit error: ${submitResponse.status} - ${errorText}`)
      }
      const submitData = await submitResponse.json() as FluxSubmitResponse

      const pollingUrl = submitData.polling_url || `${API_BASE_URL}/get_result?id=${submitData.id}`
      let imageUrl: string | undefined

      for (let pollAttempts = 0; pollAttempts < MAX_POLL_ATTEMPTS; pollAttempts++) {
        await sleep(POLL_INTERVAL_MS)
        const pollResponse = await fetch(pollingUrl, { headers: { 'x-key': apiKey } })
        if (!pollResponse.ok) {
          const errorText = await pollResponse.text()
          throw new Error(`Flux API poll error: ${pollResponse.status} - ${errorText}`)
        }
        const pollData = await pollResponse.json() as FluxPollResponse
        if (pollData.status === 'Ready') {
          imageUrl = pollData.result?.sample
          if (!imageUrl) throw new Error('Flux API returned Ready status but no image URL')
          break
        }
        if (pollData.status !== 'Pending' && pollData.status !== 'Request Moderated') {
          throw new Error(`Flux API returned terminal status: ${pollData.status}`)
        }
      }

      if (!imageUrl) throw new Error(`Flux API polling timeout after ${MAX_POLL_ATTEMPTS} attempts`)

      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) throw new Error(`Failed to download image: ${imageResponse.status}`)
      const imageBase64 = Buffer.from(await imageResponse.arrayBuffer()).toString('base64')

      return { base64: imageBase64, cost: getCostPerImage('flux', model) }
    }
  })
}

import type { SourceRoutesApiProcess04RunMediaRunImageImageServicesRunDeepinfraImageDeepInfraImageResponse as DeepInfraImageResponse,ImageGenerationResult,IProgressTracker,Step6Metadata } from '~/types'
import { requireEnvKey } from '~/utils/env'
import { getCostPerImage,runImageGenerationLoop } from './image-helpers'

const getDimensions = (aspectRatio: string): { width: number, height: number } => {
  const dimensionMap: Record<string, { width: number, height: number }> = {
    '1:1': { width: 1024, height: 1024 },
    '16:9': { width: 1344, height: 768 },
    '9:16': { width: 768, height: 1344 },
    '4:3': { width: 1152, height: 864 },
    '3:4': { width: 864, height: 1152 }
  }
  return dimensionMap[aspectRatio] || dimensionMap['1:1']!
}

const getImageBase64 = (imageData: string): string => {
  const dataUrlMatch = imageData.match(/^data:image\/[^;]+;base64,(.+)$/)
  return dataUrlMatch ? dataUrlMatch[1]! : imageData
}

export const runDeepInfraImage = async (
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
  const apiKey = requireEnvKey('DEEPINFRA_API_KEY')
  const { width, height } = getDimensions(dimensionOrRatio)

  return runImageGenerationLoop({
    service: 'deepinfra', displayName: 'DeepInfra', model, startTime: Date.now(),
    title, textOutput, selectedPrompts, customInstructions, outputDir, progressTracker, jobId,
    generateImage: async (prompt) => {
      const response = await fetch(`https://api.deepinfra.com/v1/inference/${model}`, {
        method: 'POST',
        headers: { 'Authorization': `bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width, height })
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`DeepInfra API error (${response.status}): ${errorText}`)
      }
      const data = await response.json() as DeepInfraImageResponse
      const imageData = data.images?.[0]
      if (!imageData) throw new Error('No image data in DeepInfra response')
      const actualCost = data.inference_status?.cost
      return {
        base64: getImageBase64(imageData),
        cost: actualCost ?? getCostPerImage('deepinfra', model, dimensionOrRatio),
        actualCost
      }
    }
  })
}

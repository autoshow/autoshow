import type { ImageGenerationResult,IProgressTracker,Step6Metadata } from '~/types'
import { calculateDeapiPrice,createDeapiJob,downloadDeapiResult,pollDeapiJob } from '~/utils/deapi-jobs'
import { getCostPerImage,runImageGenerationLoop } from './image-helpers'

const STEP_NUMBER = 6

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

export const runDeapiImage = async (
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
  const { width, height } = getDimensions(dimensionOrRatio)

  return runImageGenerationLoop({
    service: 'deapi', displayName: 'deAPI', model, startTime: Date.now(),
    title, textOutput, selectedPrompts, customInstructions, outputDir, progressTracker, jobId,
    generateImage: async (prompt, promptType) => {
      const requestBody = {
        prompt, model, width, height,
        guidance: 7.5, steps: 8, seed: -1,
        negative_prompt: 'blur, darkness, noise'
      }
      const actualCost = await calculateDeapiPrice('/api/v1/client/txt2img/price-calculation', requestBody, 'image generation')
      const requestId = await createDeapiJob('/api/v1/client/txt2img', { ...requestBody }, 'image generation')
      const status = await pollDeapiJob(requestId, 'image generation', progressTracker, {
        stepNumber: STEP_NUMBER,
        progressStart: 30,
        progressEnd: 75,
        progressLabel: `Rendering ${promptType} image with deAPI`
      })

      const resultUrl = status.data.result_url
      if (!resultUrl) throw new Error('deAPI image generation completed without result URL')

      const imageBuffer = await downloadDeapiResult(resultUrl, 'image generation')
      const cost = actualCost ?? getCostPerImage('deapi', model, dimensionOrRatio)
      return { base64: imageBuffer.toString('base64'), cost, actualCost }
    }
  })
}

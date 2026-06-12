import type { ImageGenerationResult,IProgressTracker,Step6Metadata } from '~/types'
import {
callGeminiGenerateContent,
extractGeminiInlineData
} from '~/routes/api/process/shared/gemini-rest'
import { getCostPerImage,requireEnvKey,runImageGenerationLoop } from './image-helpers'

const GEMINI_IMAGE_TOKEN_PRICING: Record<string, { input: number, output: number }> = {
  'gemini-2.0-flash-preview-image-generation': { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
  'imagen-3.0-generate-002': { input: 0, output: 40 / 1_000_000 }
}

const calculateGeminiImageCost = (
  model: string,
  usageMetadata: { promptTokenCount?: number, candidatesTokenCount?: number, totalTokenCount?: number } | undefined
): number | undefined => {
  if (!usageMetadata?.totalTokenCount) return undefined
  const pricing = GEMINI_IMAGE_TOKEN_PRICING[model]
  if (!pricing) return undefined
  const inputCost = (usageMetadata.promptTokenCount ?? 0) * pricing.input
  const outputCost = (usageMetadata.candidatesTokenCount ?? 0) * pricing.output
  return inputCost + outputCost
}

export const runGeminiImage = async (
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
  const apiKey = requireEnvKey('GEMINI_API_KEY')

  return runImageGenerationLoop({
    service: 'gemini', displayName: 'Gemini', model, startTime: Date.now(),
    title, textOutput, selectedPrompts, customInstructions, outputDir, progressTracker, jobId,
    generateImage: async (prompt) => {
      const response = await callGeminiGenerateContent(apiKey, model, {
        contents: prompt,
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: dimensionOrRatio } }
      })
      const usageMetadata = response.usageMetadata
      const actualCost = calculateGeminiImageCost(model, usageMetadata)

      const imagePart = extractGeminiInlineData(response, 'image/')
      if (!imagePart?.data) return null

      return {
        base64: imagePart.data,
        cost: actualCost ?? getCostPerImage('gemini', model),
        actualCost
      }
    }
  })
}

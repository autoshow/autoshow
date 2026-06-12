import type { ImageGenerationResult,IProgressTracker,Step6Metadata } from '~/types'
import { callOpenAICompatibleImageGeneration } from '~/routes/api/process/shared/openai-compatible'
import { getCostPerImage,requireEnvKey,runImageGenerationLoop } from './image-helpers'

const OPENAI_IMAGE_TOKEN_PRICING: Record<string, { input: number, output: number }> = {
  'gpt-image-1.5': { input: 5 / 1_000_000, output: 32 / 1_000_000 },
  'gpt-image-1': { input: 5 / 1_000_000, output: 40 / 1_000_000 },
  'gpt-image-1-mini': { input: 1.25 / 1_000_000, output: 10 / 1_000_000 }
}

const calculateOpenAIImageCost = (
  model: string,
  usage: { input_tokens?: number, output_tokens?: number } | undefined
): number | undefined => {
  if (!usage?.input_tokens && !usage?.output_tokens) return undefined
  const pricing = OPENAI_IMAGE_TOKEN_PRICING[model]
  if (!pricing) return undefined
  const inputCost = (usage.input_tokens ?? 0) * pricing.input
  const outputCost = (usage.output_tokens ?? 0) * pricing.output
  return inputCost + outputCost
}

export const runOpenAIImage = async (
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
  const apiKey = requireEnvKey('OPENAI_API_KEY')

  return runImageGenerationLoop({
    service: 'openai', displayName: 'OpenAI', model, startTime: Date.now(),
    title, textOutput, selectedPrompts, customInstructions, outputDir, progressTracker, jobId,
    generateImage: async (prompt) => {
      const response = await callOpenAICompatibleImageGeneration('openai', apiKey, {
        model, prompt,
        size: dimensionOrRatio,
        quality: 'high'
      })
      const usage = response.usage
      const actualCost = calculateOpenAIImageCost(model, usage)

      const imageData = response.data?.[0]
      if (!imageData?.b64_json) return null

      return {
        base64: imageData.b64_json,
        cost: actualCost ?? getCostPerImage('openai', model, dimensionOrRatio),
        actualCost,
        ...(imageData.revised_prompt ? { revisedPrompt: imageData.revised_prompt } : {})
      }
    }
  })
}

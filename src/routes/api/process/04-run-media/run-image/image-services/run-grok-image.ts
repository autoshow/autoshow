import type { SourceRoutesApiProcess04RunMediaRunImageImageServicesRunGrokImageGrokImageResponse as GrokImageResponse,ImageGenerationResult,IProgressTracker,Step6Metadata } from '~/types'
import { callOpenAICompatibleImageGeneration } from '~/routes/api/process/shared/openai-compatible'
import { getCostPerImage,requireEnvKey,runImageGenerationLoop } from './image-helpers'

const SHORT_SUMMARY_PATTERN = /"shortSummary"\s*:\s*"([^"]+)"/i
const CONTENT_TITLE_PATTERN = /Content title:\s*(.+?)\s*(?:Text Output:|$)/i

const isPromptParsingFailure = (error: unknown): boolean => {
  return error instanceof Error && /Parsing failed/i.test(error.message)
}

const extractCompactPromptDetails = (prompt: string): { title?: string, summary: string } => {
  const title = prompt.match(CONTENT_TITLE_PATTERN)?.[1]?.trim()
  const summaryMatch = prompt.match(SHORT_SUMMARY_PATTERN)?.[1]?.trim()
  const summary = (summaryMatch ?? prompt)
    .replace(/\{|\}|"/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return { ...(title && { title }), summary }
}

const buildCompactGrokImagePrompt = (prompt: string): string => {
  const { title, summary } = extractCompactPromptDetails(prompt)

  return [
    'Create a polished thumbnail-style image with bold composition and no text overlay or logos.',
    title ? `Content title: ${title}.` : null,
    `Visual concept: ${summary}.`,
    'If a person appears, depict an anonymous adult subject instead of an exact real-person likeness.'
  ]
    .filter(Boolean)
    .join(' ')
}

const logUsage = (response: GrokImageResponse): void => {
  if (!response.usage) return

}

const resolveBase64Image = async (response: GrokImageResponse): Promise<{
  base64: string
  revisedPrompt?: string
} | null> => {
  const imageData = response.data?.[0]
  if (!imageData) return null

  if (imageData.b64_json) {
    return {
      base64: imageData.b64_json,
      ...(imageData.revised_prompt ? { revisedPrompt: imageData.revised_prompt } : {})
    }
  }

  if (imageData.url) {
    const imageResponse = await fetch(imageData.url)
    if (!imageResponse.ok) {
      throw new Error(`Grok image download failed: ${imageResponse.status}`)
    }

    return {
      base64: Buffer.from(await imageResponse.arrayBuffer()).toString('base64'),
      ...(imageData.revised_prompt ? { revisedPrompt: imageData.revised_prompt } : {})
    }
  }

  return null
}

export const runGrokImage = async (
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
  const apiKey = requireEnvKey('XAI_API_KEY')

  return runImageGenerationLoop({
    service: 'grok', displayName: 'Grok', model, startTime: Date.now(),
    title, textOutput, selectedPrompts, customInstructions, outputDir, progressTracker, jobId,
    generateImage: async (prompt) => {
      try {
        const response = await callOpenAICompatibleImageGeneration('grok', apiKey, {
          model,
          prompt,
          aspect_ratio: dimensionOrRatio,
          response_format: 'b64_json'
        }) as GrokImageResponse

        logUsage(response)
        const imageData = await resolveBase64Image(response)
        if (!imageData) return null

        return {
          base64: imageData.base64,
          cost: getCostPerImage('grok', model),
          revisedPrompt: imageData.revisedPrompt
        }
      } catch (error) {
        if (!isPromptParsingFailure(error)) {
          throw error
        }

        const compactPrompt = buildCompactGrokImagePrompt(prompt)

        const response = await callOpenAICompatibleImageGeneration('grok', apiKey, {
          model,
          prompt: compactPrompt,
          aspect_ratio: dimensionOrRatio
        }) as GrokImageResponse

        logUsage(response)
        const imageData = await resolveBase64Image(response)
        if (!imageData) return null

        return {
          base64: imageData.base64,
          cost: getCostPerImage('grok', model),
          revisedPrompt: imageData.revisedPrompt
        }
      }
    }
  })
}

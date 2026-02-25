import { GoogleGenAI } from '@google/genai'
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

const SERVICE_NAME = 'Gemini'
const STEP_NUMBER = 6

export const runGeminiImage = async (
  title: string,
  textOutput: string,
  selectedPrompts: string[],
  outputDir: string,
  model: string,
  dimensionOrRatio: string,
  progressTracker?: IProgressTracker,
  jobId?: string
): Promise<{ results: ImageGenerationResult[], metadata: Step6Metadata }> => {
  const apiKey = requireEnvKey('GEMINI_API_KEY')
  const client = new GoogleGenAI({ apiKey })
  const startTime = Date.now()

  l(`Starting ${SERVICE_NAME} image generation`, { model, aspectRatio: dimensionOrRatio })

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

      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: dimensionOrRatio
          }
        }
      })

      l(`${SERVICE_NAME} API response received`, { time: `${Date.now() - imageStartTime}ms` })

      const candidates = response.candidates
      if (!candidates || candidates.length === 0) {
        l('No candidates in response', { promptType })
        continue
      }

      const parts = candidates[0]?.content?.parts
      if (!parts || parts.length === 0) {
        l('No parts in response', { promptType })
        continue
      }

      const imagePart = parts.find(part => part.inlineData?.mimeType?.startsWith('image/'))
      if (!imagePart?.inlineData?.data) {
        l('No image data in response', { promptType })
        continue
      }

      const cost = getCostPerImage('gemini', model)
      const result = await saveImageAndBuildResult(
        imagePart.inlineData.data,
        outputDir,
        promptType,
        Date.now() - imageStartTime,
        cost,
        undefined,
        jobId
      )
      results.push(result)
    }

    const metadata = buildImageMetadata('gemini', model, startTime, results, selectedPrompts)
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

import { GoogleGenAI } from '@google/genai'
import type { StructuredLLMResponse, Step4Metadata, IProgressTracker } from '~/types'
import { createDynamicSchema } from '~/routes/api/process/03-select-prompts/create-schema'
import { l } from '~/utils/logging'
import { requireEnvKey, buildLLMMetadata, logLLMCompletion, handleLLMError } from './llm-helpers'

export const runGeminiStructured = async (
  prompt: string,
  model: string,
  selectedPrompts: string[],
  progressTracker?: IProgressTracker,
  stepNumber: number = 4
): Promise<{ response: StructuredLLMResponse, metadata: Step4Metadata }> => {
  const apiKey = requireEnvKey('GEMINI_API_KEY')
  const client = new GoogleGenAI({ apiKey })
  const jsonSchema = createDynamicSchema(selectedPrompts)
  const startTime = Date.now()

  progressTracker?.updateStepProgress(stepNumber, 30, `Calling Gemini ${model}...`)
  l(`Running Gemini structured output`, { model, prompts: selectedPrompts })

  try {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: jsonSchema
      }
    })

    const responseText = response.text
    if (!responseText) {
      throw new Error('No text content in Gemini response')
    }

    const parsed = JSON.parse(responseText) as StructuredLLMResponse
    const metadata = buildLLMMetadata(
      'gemini',
      model,
      startTime,
      response.usageMetadata?.promptTokenCount ?? 0,
      response.usageMetadata?.candidatesTokenCount ?? 0
    )

    logLLMCompletion('Gemini', metadata, progressTracker, stepNumber)
    return { response: parsed, metadata }
  } catch (error) {
    return handleLLMError(error, 'Gemini', progressTracker, stepNumber)
  }
}

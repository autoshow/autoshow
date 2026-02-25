import OpenAI from 'openai'
import type { StructuredLLMResponse, Step4Metadata, IProgressTracker } from '~/types'
import { createDynamicSchema } from '~/routes/api/process/03-select-prompts/create-schema'
import { requireEnvKey, buildLLMMetadata, logLLMCompletion, handleLLMError } from './llm-helpers'

export const runGrokStructured = async (
  prompt: string,
  model: string,
  selectedPrompts: string[],
  progressTracker?: IProgressTracker,
  stepNumber: number = 4
): Promise<{ response: StructuredLLMResponse, metadata: Step4Metadata }> => {
  const apiKey = requireEnvKey('XAI_API_KEY')
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1'
  })
  const jsonSchema = createDynamicSchema(selectedPrompts)
  const startTime = Date.now()

  progressTracker?.updateStepProgress(stepNumber, 30, `Calling Grok ${model}...`)

  try {
    const response = await client.responses.create({
      model,
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'llm_response',
          strict: true,
          schema: jsonSchema
        }
      }
    })

    const responseText = response.output_text
    if (!responseText) {
      throw new Error('No content in Grok response')
    }

    const parsed = JSON.parse(responseText) as StructuredLLMResponse
    const metadata = buildLLMMetadata(
      'grok',
      model,
      startTime,
      response.usage?.input_tokens ?? 0,
      response.usage?.output_tokens ?? 0
    )

    logLLMCompletion('Grok', metadata, progressTracker, stepNumber)
    return { response: parsed, metadata }
  } catch (error) {
    return handleLLMError(error, 'Grok', progressTracker, stepNumber)
  }
}

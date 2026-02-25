import OpenAI from 'openai'
import type { StructuredLLMResponse, Step4Metadata, IProgressTracker } from '~/types'
import { createDynamicSchema } from '~/routes/api/process/03-select-prompts/create-schema'
import { l } from '~/utils/logging'
import { requireEnvKey, buildLLMMetadata, logLLMCompletion, handleLLMError } from './llm-helpers'

export const runOpenAIStructured = async (
  prompt: string,
  model: string,
  selectedPrompts: string[],
  progressTracker?: IProgressTracker,
  stepNumber: number = 4
): Promise<{ response: StructuredLLMResponse, metadata: Step4Metadata }> => {
  const apiKey = requireEnvKey('OPENAI_API_KEY')
  const client = new OpenAI({ apiKey })
  const jsonSchema = createDynamicSchema(selectedPrompts)
  const startTime = Date.now()

  progressTracker?.updateStepProgress(stepNumber, 30, `Calling OpenAI ${model}...`)
  l(`Running OpenAI structured output`, { model, prompts: selectedPrompts })

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
      throw new Error('No content in OpenAI response')
    }

    const parsed = JSON.parse(responseText) as StructuredLLMResponse
    const metadata = buildLLMMetadata(
      'openai',
      model,
      startTime,
      response.usage?.input_tokens ?? 0,
      response.usage?.output_tokens ?? 0
    )

    logLLMCompletion('OpenAI', metadata, progressTracker, stepNumber)
    return { response: parsed, metadata }
  } catch (error) {
    return handleLLMError(error, 'OpenAI', progressTracker, stepNumber)
  }
}

import {
callOpenAICompatibleResponses,
extractOutputText,
getResponsesUsageTokens
} from '~/routes/api/process/shared/openai-compatible'
import { createLLMRunner,requireEnvKey } from './llm-helpers'

const JSON_SCHEMA_REJECTION_PATTERN = /(Parsing failed|Failed to validate JSON)/i

const buildResponseFormat = (jsonSchema: Record<string, unknown>, strict: boolean) => ({
  type: 'json_schema' as const,
  name: 'llm_response',
  strict,
  schema: jsonSchema
})

export const runGroqStructured = createLLMRunner({
  service: 'groq',
  displayName: 'Groq',
  callApi: async (prompt, model, jsonSchema) => {
    const apiKey = requireEnvKey('GROQ_API_KEY')

    const createResponse = async (strict: boolean) => {
      return callOpenAICompatibleResponses('groq', apiKey, {
        model,
        input: prompt,
        text: { format: buildResponseFormat(jsonSchema, strict) }
      })
    }

    try {
      const response = await createResponse(true)
      const usage = getResponsesUsageTokens(response)
      return {
        responseText: extractOutputText(response),
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens
      }
    } catch (error) {
      if (!(error instanceof Error) || !JSON_SCHEMA_REJECTION_PATTERN.test(error.message)) {
        throw error
      }

      const response = await createResponse(false)
      const usage = getResponsesUsageTokens(response)
      return {
        responseText: extractOutputText(response),
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens
      }
    }
  }
})

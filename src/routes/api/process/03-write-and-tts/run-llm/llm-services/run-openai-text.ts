import {
callOpenAICompatibleResponses,
extractOutputText,
getResponsesUsageTokens
} from '~/routes/api/process/shared/openai-compatible'
import { createLLMRunner,requireEnvKey } from './llm-helpers'

export const runOpenAIStructured = createLLMRunner({
  service: 'openai',
  displayName: 'OpenAI',
  callApi: async (prompt, model, jsonSchema) => {
    const response = await callOpenAICompatibleResponses('openai', requireEnvKey('OPENAI_API_KEY'), {
      model,
      input: prompt,
      text: { format: { type: 'json_schema', name: 'llm_response', strict: true, schema: jsonSchema } }
    })
    const usage = getResponsesUsageTokens(response)
    return {
      responseText: extractOutputText(response),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens
    }
  }
})

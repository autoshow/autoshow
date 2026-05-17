import {
callOpenAICompatibleChatCompletions,
extractCompletionText,
getChatCompletionUsageTokens
} from '~/routes/api/process/shared/openai-compatible'
import { createLLMRunner,requireEnvKey } from './llm-helpers'

export const runGlmStructured = createLLMRunner({
  service: 'glm',
  displayName: 'GLM',
  stripFences: true,
  callApi: async (prompt, model, jsonSchema) => {
    const systemPrompt = `You are a JSON generator. You MUST respond with valid JSON only, no other text.
The JSON must conform to this schema:
${JSON.stringify(jsonSchema, null, 2)}

Respond with ONLY the JSON object, no markdown code blocks, no explanation.`

    const response = await callOpenAICompatibleChatCompletions('glm', requireEnvKey('GLM_API_KEY'), {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
    const usage = getChatCompletionUsageTokens(response)
    return {
      responseText: extractCompletionText(response),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens
    }
  }
})

import { callAnthropicMessages,extractAnthropicTextContent } from '~/routes/api/process/shared/anthropic-messages'
import { createLLMRunner,requireEnvKey } from './llm-helpers'

export const runMinimaxStructured = createLLMRunner({
  service: 'minimax',
  displayName: 'MiniMax',
  stripFences: true,
  callApi: async (prompt, model, jsonSchema) => {
    const systemPrompt = `You are a JSON generator. You MUST respond with valid JSON only, no other text.
The JSON must conform to this schema:
${JSON.stringify(jsonSchema, null, 2)}

Respond with ONLY the JSON object, no markdown code blocks, no explanation.`

    const response = await callAnthropicMessages('minimax', requireEnvKey('MINIMAX_API_KEY'), {
      model,
      max_tokens: 16384,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    })
    return {
      responseText: extractAnthropicTextContent(response),
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens
    }
  }
})

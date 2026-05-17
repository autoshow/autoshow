import { buildAnthropicJsonSchemaOutputFormat,callAnthropicMessages,extractAnthropicTextContent } from '~/routes/api/process/shared/anthropic-messages'
import { createLLMRunner,requireEnvKey } from './llm-helpers'

export const runClaudeStructured = createLLMRunner({
  service: 'claude',
  displayName: 'Claude',
  stripFences: true,
  callApi: async (prompt, model, jsonSchema) => {
    const response = await callAnthropicMessages('anthropic', requireEnvKey('ANTHROPIC_API_KEY'), {
      model,
      max_tokens: 16384,
      system: 'You are a JSON generator. Return only valid JSON that matches the requested output schema.',
      messages: [{ role: 'user', content: prompt }],
      output_config: {
        format: buildAnthropicJsonSchemaOutputFormat(jsonSchema as Record<string, unknown>)
      }
    })
    const responseText = extractAnthropicTextContent(response)

    return {
      responseText: undefined,
      parsedResponse: responseText ? JSON.parse(responseText) : undefined,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens
    }
  }
})

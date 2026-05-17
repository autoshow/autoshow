import {
buildGeminiStructuredJsonGenerationConfig,
callGeminiGenerateContent,
extractGeminiText,
getGeminiUsageTokens
} from '~/routes/api/process/shared/gemini-rest'
import { createLLMRunner,requireEnvKey } from './llm-helpers'

export const runGeminiStructured = createLLMRunner({
  service: 'gemini',
  displayName: 'Gemini',
  callApi: async (prompt, model, jsonSchema) => {
    const response = await callGeminiGenerateContent(requireEnvKey('GEMINI_API_KEY'), model, {
      contents: prompt,
      generationConfig: buildGeminiStructuredJsonGenerationConfig(jsonSchema)
    })
    const usage = getGeminiUsageTokens(response)
    return {
      responseText: extractGeminiText(response),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens
    }
  }
})

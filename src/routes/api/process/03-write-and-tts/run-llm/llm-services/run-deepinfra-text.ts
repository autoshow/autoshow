import type { IProgressTracker,Step4Metadata,StructuredLLMResponse } from '~/types'
import {
callOpenAICompatibleChatCompletions,
extractCompletionText,
getChatCompletionUsageTokens
} from '~/routes/api/process/shared/openai-compatible'
import { createDynamicSchema } from '~/types/schema/create-dynamic-schema'
import { buildLLMMetadata,requireEnvKey } from './llm-helpers'

const stripMarkdownFences = (text: string): string => {
  let result = text.trim()
  if (result.startsWith('```json')) {
    result = result.slice(7)
  } else if (result.startsWith('```')) {
    result = result.slice(3)
  }
  if (result.endsWith('```')) {
    result = result.slice(0, -3)
  }
  return result.trim()
}

const logLLMCompletion = (
  _serviceName: string,
  _metadata: Step4Metadata,
  progressTracker?: IProgressTracker,
  stepNumber: number = 4
): void => {
  progressTracker?.updateStepProgress(stepNumber, 90, 'Processing response')
}

const handleLLMError = (
  error: unknown,
  _serviceName: string,
  progressTracker?: IProgressTracker,
  stepNumber: number = 4
): never => {
  progressTracker?.error(stepNumber, 'Structured output failed', error instanceof Error ? error.message : 'Unknown error')
  if (error instanceof SyntaxError) {
    throw new Error('Failed to parse LLM response as JSON')
  }
  throw error
}

const extractMessageText = (content: unknown): string => {
  if (typeof content === 'string') {
    return content.trim()
  }

  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .map(part => {
      if (typeof part === 'string') {
        return part
      }
      if (typeof part !== 'object' || part === null) {
        return ''
      }

      const record = part as Record<string, unknown>
      return typeof record.text === 'string' ? record.text : ''
    })
    .join('')
    .trim()
}

const stripLeadingThinkingBlocks = (text: string): string => {
  let result = text.trim()

  while (result.toLowerCase().startsWith('<think>')) {
    const lower = result.toLowerCase()
    const closingTagIndex = lower.indexOf('</think>')
    if (closingTagIndex === -1) {
      break
    }
    result = result.slice(closingTagIndex + '</think>'.length).trim()
  }

  return result
}

const normalizeJsonResponseText = (text: string): string => {
  return stripMarkdownFences(stripLeadingThinkingBlocks(text))
}

const buildPrimarySystemInstruction = (jsonSchema: Record<string, unknown>): string => {
  return `Return only valid JSON matching this schema exactly: ${JSON.stringify(jsonSchema)}`
}

const buildFallbackSystemInstruction = (jsonSchema: Record<string, unknown>): string => {
  return `You are a JSON generator. Return ONLY valid JSON that matches this schema exactly: ${JSON.stringify(jsonSchema)}. Do not include markdown fences, commentary, or <think> tags.`
}

const requestDeepInfraStructuredResponse = async (
  apiKey: string,
  prompt: string,
  model: string,
  systemInstruction: string,
  useResponseFormat: boolean
): Promise<{ responseText: string; inputTokens?: number; outputTokens?: number }> => {
  const response = await callOpenAICompatibleChatCompletions('deepinfra', apiKey, {
    model,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt }
    ],
    ...(useResponseFormat ? { response_format: { type: 'json_object' as const } } : {})
  })
  const usage = getChatCompletionUsageTokens(response)

  return {
    responseText: extractMessageText(extractCompletionText(response)),
    ...(usage.inputTokens != null && { inputTokens: usage.inputTokens }),
    ...(usage.outputTokens != null && { outputTokens: usage.outputTokens })
  }
}

export const runDeepInfraStructured = async (
  prompt: string,
  model: string,
  selectedPrompts: string[],
  progressTracker?: IProgressTracker,
  stepNumber: number = 4
): Promise<{ response: StructuredLLMResponse, metadata: Step4Metadata }> => {
  const jsonSchema = createDynamicSchema(selectedPrompts)
  const apiKey = requireEnvKey('DEEPINFRA_API_KEY')
  const startTime = Date.now()

  progressTracker?.updateStepProgress(stepNumber, 30, `Calling DeepInfra ${model}...`)

  try {
    let totalInputTokens = 0
    let totalOutputTokens = 0

    const primaryAttempt = await requestDeepInfraStructuredResponse(
      apiKey,
      prompt,
      model,
      buildPrimarySystemInstruction(jsonSchema),
      true
    )
    totalInputTokens += primaryAttempt.inputTokens ?? 0
    totalOutputTokens += primaryAttempt.outputTokens ?? 0

    let responseText = normalizeJsonResponseText(primaryAttempt.responseText)
    if (!responseText) {
      const fallbackAttempt = await requestDeepInfraStructuredResponse(
        apiKey,
        prompt,
        model,
        buildFallbackSystemInstruction(jsonSchema),
        false
      )
      totalInputTokens += fallbackAttempt.inputTokens ?? 0
      totalOutputTokens += fallbackAttempt.outputTokens ?? 0
      responseText = normalizeJsonResponseText(fallbackAttempt.responseText)
    }

    if (!responseText) {
      throw new Error('No content in DeepInfra response')
    }

    const parsed = JSON.parse(responseText) as StructuredLLMResponse
    const metadata = buildLLMMetadata('deepinfra', model, startTime, totalInputTokens, totalOutputTokens)
    logLLMCompletion('DeepInfra', metadata, progressTracker, stepNumber)
    return { response: parsed, metadata }
  } catch (error) {
    return handleLLMError(error, 'DeepInfra', progressTracker, stepNumber)
  }
}

import type { Step4Metadata, IProgressTracker, LLMServiceType } from '~/types'
import { l, err } from '~/utils/logging'
export { requireEnvKey } from '~/utils/env'

export const stripMarkdownFences = (text: string): string => {
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

export const buildLLMMetadata = (
  llmService: LLMServiceType,
  llmModel: string,
  startTime: number,
  inputTokenCount: number,
  outputTokenCount: number
): Step4Metadata => ({
  llmService,
  llmModel,
  processingTime: Date.now() - startTime,
  inputTokenCount,
  outputTokenCount
})

export const logLLMCompletion = (
  serviceName: string,
  metadata: Step4Metadata,
  progressTracker?: IProgressTracker,
  stepNumber: number = 4
): void => {
  progressTracker?.updateStepProgress(stepNumber, 90, 'Processing response')
  l(`${serviceName} structured output completed`, {
    processingTime: `${metadata.processingTime}ms`,
    inputTokens: metadata.inputTokenCount,
    outputTokens: metadata.outputTokenCount
  })
}

export const handleLLMError = (
  error: unknown,
  serviceName: string,
  progressTracker?: IProgressTracker,
  stepNumber: number = 4
): never => {
  progressTracker?.error(stepNumber, 'Structured output failed', error instanceof Error ? error.message : 'Unknown error')
  if (error instanceof SyntaxError) {
    err(`${serviceName} response JSON parsing failed: ${error.message}`)
    throw new Error('Failed to parse LLM response as JSON')
  }
  throw error
}

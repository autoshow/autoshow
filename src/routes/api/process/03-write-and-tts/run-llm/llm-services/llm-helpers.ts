import type { IProgressTracker,SourceRoutesApiProcess03WriteAndTtsRunLlmLlmServicesLlmHelpersLLMCallResult as LLMCallResult,LLMServiceType,Step4Metadata,StructuredLLMResponse } from '~/types'
import { createDynamicSchema } from '~/types/schema/create-dynamic-schema'
import { calculateLLMTokenCost } from '~/utils/cost-helpers'
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

const logLLMCompletion = (
  _serviceName: string,
  _metadata: Step4Metadata,
  progressTracker?: IProgressTracker,
  stepNumber: number = 4
): void => {
  progressTracker?.updateStepProgress(stepNumber, 90, 'Processing response')
}

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

export { requireEnvKey } from '~/utils/env'

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const matchesTopLevelJsonType = (value: unknown, expectedType: string): boolean => {
  if (expectedType === 'string') {
    return typeof value === 'string'
  }

  if (expectedType === 'array') {
    return Array.isArray(value)
  }

  if (expectedType === 'object') {
    return isPlainObject(value)
  }

  return true
}
const validateStructuredResponseShape = (
  response: unknown,
  jsonSchema: Record<string, unknown>
): StructuredLLMResponse => {
  if (!isPlainObject(response)) {
    throw new Error('Structured output response must be a JSON object')
  }

  const properties = isPlainObject(jsonSchema.properties)
    ? jsonSchema.properties
    : {}
  const requiredFields = Array.isArray(jsonSchema.required)
    ? jsonSchema.required.filter((field): field is string => typeof field === 'string')
    : []

  for (const field of requiredFields) {
    if (!(field in response)) {
      throw new Error(`Structured output missing required field: ${field}`)
    }

    const fieldSchema = properties[field]
    const expectedType = isPlainObject(fieldSchema) && typeof fieldSchema.type === 'string'
      ? fieldSchema.type
      : null

    if (expectedType && !matchesTopLevelJsonType(response[field], expectedType)) {
      throw new Error(`Structured output field "${field}" must be ${expectedType}`)
    }
  }

  return response as StructuredLLMResponse
}

export const buildLLMMetadata = (
  llmService: LLMServiceType,
  llmModel: string,
  startTime: number,
  inputTokenCount?: number,
  outputTokenCount?: number
): Step4Metadata => {
  const costResult = calculateLLMTokenCost(llmService, llmModel, inputTokenCount, outputTokenCount)
  return {
    llmService,
    llmModel,
    processingTime: Date.now() - startTime,
    ...(inputTokenCount != null && { inputTokenCount }),
    ...(outputTokenCount != null && { outputTokenCount }),
    ...(costResult && { totalCost: costResult.totalCost, actualCostUsd: costResult.actualCostUsd })
  }
}

export const createLLMRunner = (config: {
  service: LLMServiceType
  displayName: string
  stripFences?: boolean
  callApi: (prompt: string, model: string, jsonSchema: any) => Promise<LLMCallResult>
}) => {
  return async (
    prompt: string,
    model: string,
    selectedPrompts: string[],
    progressTracker?: IProgressTracker,
    stepNumber: number = 4
  ): Promise<{ response: StructuredLLMResponse, metadata: Step4Metadata }> => {
    const jsonSchema = createDynamicSchema(selectedPrompts)
    const startTime = Date.now()

    progressTracker?.updateStepProgress(stepNumber, 30, `Calling ${config.displayName} ${model}...`)

    try {
      const { responseText, parsedResponse, inputTokens, outputTokens } = await config.callApi(prompt, model, jsonSchema)
      let parsed: StructuredLLMResponse

      if (parsedResponse !== undefined) {
        parsed = validateStructuredResponseShape(parsedResponse, jsonSchema)
      } else {
        if (!responseText) {
          throw new Error(`No content in ${config.displayName} response`)
        }

        const jsonText = config.stripFences ? stripMarkdownFences(responseText) : responseText
        parsed = validateStructuredResponseShape(JSON.parse(jsonText), jsonSchema)
      }

      const metadata = buildLLMMetadata(config.service, model, startTime, inputTokens, outputTokens)
      logLLMCompletion(config.displayName, metadata, progressTracker, stepNumber)
      return { response: parsed, metadata }
    } catch (error) {
      return handleLLMError(error, config.displayName, progressTracker, stepNumber)
    }
  }
}

import type {
DocumentExtractionModel,DocumentExtractionResult,IProgressTracker,SourceRoutesApiProcess02RunTranscribeDocumentServicesDocumentHelpersLLMDocumentService as LLMDocumentService,Step2DocumentMetadata,
SupportedDocumentType
} from '~/types'
import { calculateLLMTokenCost } from '~/utils/cost-helpers'
export { requireEnvKey } from '~/utils/env'

const DOCUMENT_EXTRACTION_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    markdown: {
      type: 'string'
    }
  },
  required: ['markdown']
} as const

const MAX_RETRIES = 3

export const DOCUMENT_EXTRACTION_JSON_SCHEMA = DOCUMENT_EXTRACTION_RESPONSE_SCHEMA

export const buildDocumentExtractionPrompt = (documentType: SupportedDocumentType): string => {
  const formatLabel = documentType.toUpperCase()

  return [
    `Extract the provided ${formatLabel} document into clean Markdown.`,
    'Preserve headings, paragraphs, bullet lists, numbered lists, links, and tables whenever possible.',
    'Use Markdown tables when a table is clearly present.',
    'Do not summarize, omit sections, or add commentary.',
    'Return valid JSON with a single `markdown` field.'
  ].join(' ')
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

export const parseDocumentExtractionResponse = (text: string): { markdown: string } => {
  const parsed = JSON.parse(stripMarkdownFences(text)) as { markdown?: unknown }
  if (typeof parsed.markdown !== 'string') {
    throw new Error('Document extraction response did not include a markdown string')
  }
  return { markdown: parsed.markdown.trim() }
}

export const buildDocumentMetadata = (
  service: LLMDocumentService,
  model: DocumentExtractionModel,
  startTime: number,
  pageCount: number,
  markdown: string,
  inputTokenCount?: number,
  outputTokenCount?: number,
  preprocessedFromType?: SupportedDocumentType
): Step2DocumentMetadata => {
  const costResult = calculateLLMTokenCost(service, model, inputTokenCount, outputTokenCount)

  return {
    extractionService: service,
    extractionModel: model,
    processingTime: Date.now() - startTime,
    pageCount,
    characterCount: markdown.length,
    ...(inputTokenCount != null && { inputTokenCount }),
    ...(outputTokenCount != null && { outputTokenCount }),
    ...(preprocessedFromType ? { preprocessedFromType } : {}),
    ...(costResult ? { totalCost: costResult.totalCost, actualCostUsd: costResult.actualCostUsd } : {})
  }
}

export const logDocumentCompletion = (
  _serviceName: string,
  _metadata: Step2DocumentMetadata,
  progressTracker?: IProgressTracker
): void => {
  progressTracker?.updateStepProgress(2, 90, 'Processing extraction results')
}

export const buildDocumentExtractionResult = (
  metadata: Step2DocumentMetadata,
  markdown: string
): DocumentExtractionResult => {
  return {
    markdown,
    pageCount: metadata.pageCount,
    metadata
  }
}

export const runDocumentRequestWithRetries = async <T,>(
  serviceName: string,
  progressTracker: IProgressTracker | undefined,
  runAttempt: (attemptNumber: number) => Promise<T>
): Promise<T> => {
  let lastError: unknown

  for (let attemptNumber = 1; attemptNumber <= MAX_RETRIES; attemptNumber++) {
    try {
      if (attemptNumber > 1) {
        progressTracker?.updateStepProgress(2, 45, `Retrying ${serviceName} (${attemptNumber}/${MAX_RETRIES})`)
      }

      return await runAttempt(attemptNumber)
    } catch (error) {
      lastError = error
      if (attemptNumber === MAX_RETRIES) {
        break
      }

      await Bun.sleep(attemptNumber * 1000)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${serviceName} document extraction failed`)
}

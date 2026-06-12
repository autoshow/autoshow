import { isDocumentServiceSupportedForType } from '~/models/models-config/document-config'
import { estimateModelCostUsd } from '~/models/models-utils/estimate-cost'
import { findDocumentModel } from '~/models/models-utils/model-lookup'
import type { CostBreakdown,ProcessingOptions } from '~/types'
import {
estimateImageDisplayCost,
estimateLLMDisplayCost,
estimateMusicDisplayCost,
estimateTTSDisplayCost,
estimateTranscriptionDisplayCost,
estimateVideoDisplayCost,
getResolvedPromptCount
} from '~/utils/cost-helpers'

const DEFAULT_DOCUMENT_PAGE_COUNT = 1

function getDocumentSourceSizeBytes(options: ProcessingOptions): number | undefined {
  if (options.localFileSize != null && options.localFileSize > 0) {
    return options.localFileSize
  }

  if (options.localFilePath) {
    return Bun.file(options.localFilePath).size
  }

  return options.urlFileSize
}

export function getDocumentFlatRateUsd(service: string, model: string, pageCount: number): number {
  const modelConfig = findDocumentModel(service, model)
  if (!modelConfig || modelConfig.costPerPage == null) {
    throw new Error(`Missing flat-rate document pricing for ${service}:${model}`)
  }

  return pageCount * modelConfig.costPerPage
}

export function estimateCostBreakdown(options: ProcessingOptions): CostBreakdown {
  const isDocumentInput = options.inputType === 'document'
  let transcription = 0
  let document = 0
  let llm = 0
  let tts = 0
  let image = 0
  let music = 0
  let video = 0

  if (!isDocumentInput) {
    const transcriptionEstimate = estimateTranscriptionDisplayCost(
      options.transcriptionService,
      options.transcriptionModel,
      options.urlDuration
    )
    transcription = transcriptionEstimate?.usd ?? 0
  }

  // User-visible LLM cost — only when llmEnabled
  if (options.llmEnabled && options.llmService && options.llmModel) {
    llm = estimateLLMDisplayCost(
      options.llmService,
      options.llmModel,
      options.selectedPrompts ?? [],
      options.urlDuration,
      isDocumentInput
        ? {
          sourceType: 'document',
          documentPages: options.documentPageCount ?? DEFAULT_DOCUMENT_PAGE_COUNT,
          documentType: options.documentType,
          inputBytes: getDocumentSourceSizeBytes(options)
        }
        : undefined
    )?.usd ?? 0
  }

  if (options.ttsEnabled && options.ttsService && options.ttsModel) {
    tts = estimateTTSDisplayCost(
      options.ttsService,
      options.ttsModel,
      options.selectedPrompts ?? []
    )?.usd ?? 0
  }

  if (options.imageGenEnabled && options.imageService && options.imageModel) {
    image = estimateImageDisplayCost(
      options.imageService,
      options.imageModel,
      options.imageDimensionOrRatio,
      getResolvedPromptCount(options.selectedImagePrompts)
    )?.usd ?? 0
  }

  if (options.musicGenEnabled && options.musicService && options.musicModel) {
    music = estimateMusicDisplayCost({
      musicService: options.musicService,
      musicModel: options.musicModel,
      musicDurationSeconds: options.musicDurationSeconds,
      musicInstrumental: options.musicInstrumental,
      llmEnabled: options.llmEnabled,
      llmService: options.llmService,
      llmModel: options.llmModel,
      sourceDurationSeconds: options.urlDuration
    })?.usd ?? 0
  }

  if (options.videoGenEnabled && options.videoService && options.videoModel) {
    video = estimateVideoDisplayCost({
      videoService: options.videoService,
      videoModel: options.videoModel,
      videoDuration: options.videoDuration,
      promptCount: getResolvedPromptCount(options.selectedVideoPrompts),
      llmEnabled: options.llmEnabled,
      llmService: options.llmService,
      llmModel: options.llmModel,
      sourceDurationSeconds: options.urlDuration
    })?.usd ?? 0
  }

  if (isDocumentInput && options.documentService && options.documentModel) {
    const documentModel = findDocumentModel(options.documentService, options.documentModel)
    const documentTypeSupported = options.documentType == null
      || isDocumentServiceSupportedForType(options.documentService, options.documentType)

    if (documentModel && documentTypeSupported) {
      const documentUsd = estimateModelCostUsd(
        documentModel.estimation,
        {
          documentPages: options.documentPageCount ?? DEFAULT_DOCUMENT_PAGE_COUNT,
          documentType: options.documentType,
          inputBytes: getDocumentSourceSizeBytes(options)
        }
      )
      document = documentUsd
    }
  }

  const total = transcription + document + llm + tts + image + music + video

  return {
    transcription,
    document,
    llm,
    tts,
    image,
    music,
    video,
    total
  }
}

export function estimateTotalCost(options: ProcessingOptions): number {
  return estimateCostBreakdown(options).total
}

import { getDefaultMusicModelForService } from '~/models/models-config/music-config'
import { estimateModelDurationMs } from '~/models/models-utils/estimate-speed'
import {
findDocumentModel,
findImageModel,
findLLMModel,
findMusicModel,
findTranscriptionModel,
findTTSModel,
findVideoModel
} from '~/models/models-utils/model-lookup'
import { PROMPT_CONFIG } from '~/prompts/text-prompts/text-prompt-config'
import type { RuntimeEstimationBreakdown as EstimatedProcessingBreakdown,ProcessingOptions,PromptType } from '~/types'
import { buildLLMEstimationContext } from '~/utils/cost-helpers'

const DEFAULT_CHARS_PER_TOKEN = 4

const NARRATABLE_PROMPTS = new Set<PromptType>([
  'shortSummary',
  'longSummary',
  'bulletPoints',
  'takeaways',
  'faq'
])

export const estimateNarratableCharacterCount = (
  selectedPrompts?: readonly string[] | undefined
): number | undefined => {
  const narratablePromptTypes = (selectedPrompts ?? []).filter((prompt): prompt is PromptType => {
    return NARRATABLE_PROMPTS.has(prompt as PromptType)
  })

  if (narratablePromptTypes.length === 0) {
    return undefined
  }

  const estimatedOutputTokens = narratablePromptTypes.reduce((sum, prompt) => {
    return sum + (PROMPT_CONFIG[prompt]?.outputTokens ?? 0)
  }, 0)

  if (estimatedOutputTokens <= 0) {
    return undefined
  }

  return estimatedOutputTokens * DEFAULT_CHARS_PER_TOKEN
}

const DEFAULT_DURATION_MINUTES = 30
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

export const estimateProcessingBreakdown = (options: ProcessingOptions): EstimatedProcessingBreakdown => {
  const durationMinutes = options.urlDuration ? options.urlDuration / 60 : DEFAULT_DURATION_MINUTES
  const breakdown: EstimatedProcessingBreakdown = { total: 0 }

  if (options.inputType === 'document' && options.documentService && options.documentModel) {
    const model = findDocumentModel(options.documentService, options.documentModel)
    if (model) {
      breakdown.step2 = estimateModelDurationMs(model.estimation, {
        documentPages: options.documentPageCount ?? DEFAULT_DOCUMENT_PAGE_COUNT,
        documentType: options.documentType,
        inputBytes: getDocumentSourceSizeBytes(options)
      })
    }
  } else {
    const model = findTranscriptionModel(options.transcriptionService, options.transcriptionModel)
    if (model) {
      breakdown.step2 = estimateModelDurationMs(model.estimation, {
        inputMinutes: durationMinutes
      })
    }
  }

  if (options.llmService && options.llmModel) {
    const model = findLLMModel(options.llmService, options.llmModel)
    if (model) {
      breakdown.step3 = estimateModelDurationMs(
        model.estimation,
        buildLLMEstimationContext(
          options.selectedPrompts ?? [],
          options.urlDuration,
          options.inputType === 'document'
            ? {
              sourceType: 'document',
              documentPages: options.documentPageCount ?? DEFAULT_DOCUMENT_PAGE_COUNT,
              documentType: options.documentType,
              inputBytes: getDocumentSourceSizeBytes(options)
            }
            : undefined
        )
      )
    }
  }

  if (options.ttsEnabled && options.ttsService && options.ttsModel) {
    const model = findTTSModel(options.ttsService, options.ttsModel)
    if (model) {
      breakdown.step3 = (breakdown.step3 ?? 0) + estimateModelDurationMs(model.estimation, {
        characters: estimateNarratableCharacterCount(options.selectedPrompts ?? []) ?? 1_500
      })
    }
  }

  if (options.imageGenEnabled && options.imageService && options.imageModel) {
    const model = findImageModel(options.imageService, options.imageModel)
    if (model) {
      breakdown.step4 = (breakdown.step4 ?? 0) + estimateModelDurationMs(model.estimation, {
        promptCount: options.selectedImagePrompts?.length || 1,
        variant: options.imageDimensionOrRatio
      })
    }
  }

  if (options.musicGenEnabled && options.musicService) {
    const modelId = options.musicModel || getDefaultMusicModelForService(options.musicService)
    const model = findMusicModel(options.musicService, modelId)
    if (model) {
      breakdown.step4 = (breakdown.step4 ?? 0) + estimateModelDurationMs(model.estimation, {
        outputSeconds: options.musicDurationSeconds ?? 30
      })
    }
  }

  if (options.videoGenEnabled && options.videoService && options.videoModel) {
    const model = findVideoModel(options.videoService, options.videoModel)
    if (model) {
      breakdown.step4 = (breakdown.step4 ?? 0) + estimateModelDurationMs(model.estimation, {
        promptCount: options.selectedVideoPrompts?.length || 1,
        outputSeconds: options.videoDuration ?? 8
      })
    }
  }

  breakdown.total = [
    breakdown.step2,
    breakdown.step3,
    breakdown.step4,
  ].reduce<number>((sum, value) => sum + (value ?? 0), 0)

  return breakdown
}

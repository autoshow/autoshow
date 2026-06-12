import { LLM_CONFIG } from '~/models/models-config/llm-config'
import { estimateModelCostUsd } from '~/models/models-utils/estimate-cost'
import { findDocumentModel,findImageModel,findLLMModel,findMusicModel,findTTSModel,findTranscriptionModel,findVideoModel } from '~/models/models-utils/model-lookup'
import { PROMPT_CONFIG } from '~/prompts/text-prompts/text-prompt-config'
import type {
SourceUtilsCostHelpersAuxiliaryLLMEstimateOptions as AuxiliaryLLMEstimateOptions,
DocumentExtractionServiceType,
SourceUtilsCostHelpersEstimatedDisplayCost as EstimatedDisplayCost,
ImageGenServiceType,
LLMServiceType,
SourceModelsModelsUtilsEstimateCostModelEstimationContext as ModelEstimationContext,
MusicServiceType,
SourceUtilsCostHelpersPromptTokenEstimate as PromptTokenEstimate,
PromptType,
SupportedDocumentType,
TTSServiceType,
SourceUtilsCostHelpersTokenCost as TokenCost,
VideoGenServiceType
} from '~/types'

const estimateNarratableCharacterCount = (
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

export const DEFAULT_AUX_LLM = { service: 'openai' as const, model: 'gpt-5.4' }
export const TTS_PLACEHOLDER_COST_USD = 0.05

const DEFAULT_SOURCE_DURATION_SECONDS = 30 * 60
const DEFAULT_TTS_CHARS_ESTIMATE = 1_500
const DEFAULT_CHARS_PER_TOKEN = 4
const DEFAULT_LLM_PROMPT: PromptType = 'shortSummary'

const NARRATABLE_PROMPTS = new Set<PromptType>([
  'shortSummary',
  'longSummary',
  'bulletPoints',
  'takeaways',
  'faq'
])

export const formatCostAmount = (value: number): string => {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export const formatUsdAsCentsLabel = (usd: number): string => {
  const cents = (Number.isFinite(usd) ? Math.max(0, usd) : 0) * 100
  if (cents === 0) return '0'

  if (cents >= 0.01) {
    return cents.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return cents.toLocaleString(undefined, { maximumFractionDigits: 8 })
}

export const formatUsdAsCents = (usd: number | null | undefined): string => {
  if (usd == null) return 'N/A'
  return `${formatUsdAsCentsLabel(usd)}¢`
}

export const buildEstimatedDisplayCost = (usd: number): EstimatedDisplayCost => ({
  usd: Math.max(0, usd),
  centsLabel: formatUsdAsCentsLabel(usd)
})

const getSourceDurationMinutes = (sourceDurationSeconds?: number | undefined): number => {
  const resolvedDurationSeconds = sourceDurationSeconds ?? DEFAULT_SOURCE_DURATION_SECONDS
  return resolvedDurationSeconds / 60
}

const resolvePromptCount = (selectedPrompts?: readonly string[] | undefined): number => {
  return selectedPrompts?.length || 1
}

const estimatePromptTokenUsage = (
  selectedPrompts?: readonly string[] | undefined
): PromptTokenEstimate => {
  const promptKeys = selectedPrompts != null && selectedPrompts.length > 0
    ? selectedPrompts
    : [DEFAULT_LLM_PROMPT]

  let inputTokens = 0
  let outputTokens = 0

  for (const promptKey of promptKeys) {
    const promptConfig = PROMPT_CONFIG[promptKey as PromptType]
    if (!promptConfig) {
      continue
    }

    inputTokens += promptConfig.inputTokens
    outputTokens += promptConfig.outputTokens
  }

  if (inputTokens === 0 && outputTokens === 0) {
    const fallbackPrompt = PROMPT_CONFIG[DEFAULT_LLM_PROMPT]
    inputTokens = fallbackPrompt?.inputTokens ?? 0
    outputTokens = fallbackPrompt?.outputTokens ?? 0
  }

  return { inputTokens, outputTokens }
}

function hasDocumentLLMContext(
  contextOverrides?: Partial<ModelEstimationContext> | undefined
): boolean {
  return contextOverrides?.sourceType === 'document'
    || contextOverrides?.documentType != null
    || contextOverrides?.documentPages != null
    || contextOverrides?.inputBytes != null
}

export function buildLLMEstimationContext(
  selectedPrompts: readonly string[],
  sourceDurationSeconds?: number | undefined,
  contextOverrides?: Partial<ModelEstimationContext> | undefined
): ModelEstimationContext {
  const promptTokens = estimatePromptTokenUsage(selectedPrompts)
  const inputMinutes = contextOverrides?.inputMinutes
    ?? (hasDocumentLLMContext(contextOverrides) ? undefined : getSourceDurationMinutes(sourceDurationSeconds))

  return {
    ...contextOverrides,
    ...(inputMinutes != null ? { inputMinutes } : {}),
    promptCount: contextOverrides?.promptCount ?? resolvePromptCount(selectedPrompts),
    promptInputTokens: contextOverrides?.promptInputTokens ?? promptTokens.inputTokens,
    promptOutputTokens: contextOverrides?.promptOutputTokens ?? promptTokens.outputTokens
  }
}
const calculateTokenUsd = (
  modelCost: TokenCost | undefined,
  inputTokens?: number,
  outputTokens?: number
): number | undefined => {
  if (!modelCost || inputTokens == null || outputTokens == null) return undefined
  return (inputTokens * modelCost.input + outputTokens * modelCost.output) / 1_000_000
}

export const estimateTranscriptionDisplayCost = (
  transcriptionService: string,
  transcriptionModel: string,
  durationSeconds?: number | undefined
): EstimatedDisplayCost | undefined => {
  const model = findTranscriptionModel(transcriptionService, transcriptionModel)
  if (!model) return undefined

  const usd = estimateModelCostUsd(model.estimation, {
    inputMinutes: getSourceDurationMinutes(durationSeconds)
  })

  return buildEstimatedDisplayCost(usd)
}

export const estimateDocumentDisplayCost = (
  service: DocumentExtractionServiceType,
  modelId: string,
  documentType?: SupportedDocumentType | null,
  pageCount?: number | undefined
): EstimatedDisplayCost | undefined => {
  const documentModel = findDocumentModel(service, modelId)
  if (!documentModel) return undefined

  const llmModel = findLLMModel(service, modelId)

  if (llmModel?.cost) {
    const usd = estimateModelCostUsd(documentModel.estimation, {
      documentType: documentType ?? undefined,
      documentPages: pageCount ?? 1
    })
    return buildEstimatedDisplayCost(usd)
  }

  if (documentModel.costPerPage != null) {
    const usd = estimateModelCostUsd(documentModel.estimation, {
      documentPages: pageCount ?? 1
    })
    return buildEstimatedDisplayCost(usd)
  }

  return undefined
}

export const estimateLLMDisplayCost = (
  llmService: LLMServiceType,
  llmModel: string,
  selectedPrompts: readonly string[],
  sourceDurationSeconds?: number | undefined,
  contextOverrides?: Partial<ModelEstimationContext> | undefined
): EstimatedDisplayCost | undefined => {
  const model = findLLMModel(llmService, llmModel)
  if (!model) return undefined

  const usd = estimateModelCostUsd(model.estimation, buildLLMEstimationContext(selectedPrompts, sourceDurationSeconds, contextOverrides))

  return buildEstimatedDisplayCost(usd)
}

export const estimateTTSDisplayCost = (
  ttsService: TTSServiceType,
  ttsModel: string,
  selectedPrompts?: readonly string[] | undefined
): EstimatedDisplayCost | undefined => {
  const model = findTTSModel(ttsService, ttsModel)
  if (!model) return undefined

  const estimatedCharacters = estimateNarratableCharacterCount(selectedPrompts) ?? DEFAULT_TTS_CHARS_ESTIMATE
  const usd = estimateModelCostUsd(model.estimation, {
    characters: estimatedCharacters
  })

  return buildEstimatedDisplayCost(usd)
}

export const estimateImageDisplayCost = (
  imageService: ImageGenServiceType,
  imageModel: string,
  dimensionOrRatio?: string | undefined,
  promptCount?: number | undefined
): EstimatedDisplayCost | undefined => {
  const model = findImageModel(imageService, imageModel)
  if (!model) return undefined

  const usd = estimateModelCostUsd(model.estimation, {
    promptCount: promptCount ?? 1,
    variant: dimensionOrRatio
  })

  return buildEstimatedDisplayCost(usd)
}

const resolveAuxiliaryLLMSelection = (
  options: Omit<AuxiliaryLLMEstimateOptions, 'promptCount' | 'sourceDurationSeconds'>
): { llmService: LLMServiceType, llmModel: string } => {
  if (options.llmEnabled && options.llmService && options.llmModel) {
    return {
      llmService: options.llmService,
      llmModel: options.llmModel
    }
  }

  return {
    llmService: DEFAULT_AUX_LLM.service,
    llmModel: DEFAULT_AUX_LLM.model
  }
}

const estimateAuxiliaryLLMDisplayCost = (
  options: AuxiliaryLLMEstimateOptions
): EstimatedDisplayCost | undefined => {
  const { llmService, llmModel } = resolveAuxiliaryLLMSelection(options)
  const model = findLLMModel(llmService, llmModel)
  if (!model) return undefined

  const usd = estimateModelCostUsd(model.estimation, {
    inputMinutes: getSourceDurationMinutes(options.sourceDurationSeconds),
    promptCount: options.promptCount ?? 1
  })

  return buildEstimatedDisplayCost(usd)
}

export const estimateMusicDisplayCost = (options: {
  musicService: MusicServiceType
  musicModel: string
  musicDurationSeconds?: number | undefined
  musicInstrumental?: boolean | undefined
  llmEnabled?: boolean | undefined
  llmService?: LLMServiceType | undefined
  llmModel?: string | undefined
  sourceDurationSeconds?: number | undefined
}): EstimatedDisplayCost | undefined => {
  const model = findMusicModel(options.musicService, options.musicModel)
  if (!model) return undefined

  const durationSeconds = options.musicDurationSeconds ?? 30
  const renderUsd = estimateModelCostUsd(
    model.estimation,
    {
      outputSeconds: durationSeconds
    }
  )
  const auxiliaryUsd = options.musicInstrumental
    ? 0
    : (estimateAuxiliaryLLMDisplayCost({
      llmEnabled: options.llmEnabled,
      llmService: options.llmService,
      llmModel: options.llmModel,
      sourceDurationSeconds: options.sourceDurationSeconds
    })?.usd ?? 0)

  return buildEstimatedDisplayCost(renderUsd + auxiliaryUsd)
}

export const estimateVideoDisplayCost = (options: {
  videoService: VideoGenServiceType
  videoModel: string
  videoDuration?: number | undefined
  promptCount?: number | undefined
  llmEnabled?: boolean | undefined
  llmService?: LLMServiceType | undefined
  llmModel?: string | undefined
  sourceDurationSeconds?: number | undefined
}): EstimatedDisplayCost | undefined => {
  const model = findVideoModel(options.videoService, options.videoModel)
  if (!model) return undefined

  const promptCount = options.promptCount ?? 1
  const durationSeconds = options.videoDuration ?? 8
  const renderUsd = estimateModelCostUsd(
    model.estimation,
    {
      outputSeconds: durationSeconds,
      promptCount
    }
  )
  const auxiliaryUsd = estimateAuxiliaryLLMDisplayCost({
    llmEnabled: options.llmEnabled,
    llmService: options.llmService,
    llmModel: options.llmModel,
    promptCount,
    sourceDurationSeconds: options.sourceDurationSeconds
  })?.usd ?? 0

  return buildEstimatedDisplayCost(renderUsd + auxiliaryUsd)
}

export const calculateLLMTokenCost = (
  llmService: LLMServiceType,
  llmModel: string,
  inputTokens?: number,
  outputTokens?: number
): { totalCost: number, actualCostUsd: number } | undefined => {
  if (inputTokens == null || outputTokens == null) return undefined

  const provider = LLM_CONFIG[llmService]
  if (!provider) return undefined

  const model = provider.models.find(candidate => candidate.id === llmModel)
  if (!model?.cost) return undefined

  const totalCost = calculateTokenUsd(model.cost, inputTokens, outputTokens)
  if (totalCost == null) return undefined

  return { totalCost, actualCostUsd: totalCost }
}

export const getResolvedPromptCount = (
  selectedPrompts?: readonly string[] | undefined
): number => resolvePromptCount(selectedPrompts)

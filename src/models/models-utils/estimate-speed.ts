import { buildImageModelCostEstimation,buildLLMDocumentModelCostEstimation,buildLLMModelCostEstimation,buildMusicModelCostEstimation,buildTranscriptionModelCostEstimation,buildTTSModelCostEstimation,DEFAULT_DOCUMENT_PAGE_COUNT,DEFAULT_IMAGE_PROMPT_COUNT,DEFAULT_MUSIC_DURATION_SECONDS,DEFAULT_TTS_CHARACTERS,DEFAULT_VIDEO_DURATION_SECONDS,DEFAULT_VIDEO_PROMPT_COUNT,estimateLLMTokens,getResolvedImageValue } from '~/models/models-utils/estimate-cost'
import type {
SourceModelsModelsUtilsEstimateSpeedDocumentTokenEstimationSpec as DocumentTokenEstimationSpec,
SourceModelsModelsUtilsEstimateCostImageModelShape as ImageModelShape,
SourceModelsModelsUtilsEstimateSpeedLLMEstimationHeuristicShape as LLMEstimationHeuristicShape,
SourceModelsModelsUtilsEstimateCostLLMModelShape as LLMModelShape,
ModelEstimation,
SourceModelsModelsUtilsEstimateCostModelEstimationContext as ModelEstimationContext,
SourceModelsModelsUtilsEstimateCostMusicModelShape as MusicModelShape,
SourceModelsModelsUtilsEstimateCostOCRDocumentModelShape as OCRDocumentModelShape,
SourceModelsModelsUtilsEstimateSpeedSpeedOperationKey as SpeedOperationKey,
SpeedProfile,
SourceModelsModelsUtilsEstimateSpeedTokenCostShape as TokenCostShape,
SourceModelsModelsUtilsEstimateSpeedTokenHeuristic as TokenHeuristic,
SourceModelsModelsUtilsEstimateCostTranscriptionModelShape as TranscriptionModelShape,
SourceModelsModelsUtilsEstimateCostTTSModelShape as TTSModelShape,
SourceModelsModelsUtilsEstimateCostVariantMap as VariantMap,
SourceModelsModelsUtilsEstimateCostVideoModelShape as VideoModelShape
} from '~/types'

const DEFAULT_LLM_INPUT_TOKENS_PER_MINUTE = 200
const DEFAULT_LLM_OUTPUT_TOKENS_PER_PROMPT = 500
const DEFAULT_LLM_INPUT_MINUTES = 1
const DEFAULT_LLM_DOCUMENT_INPUT_TOKENS_PER_PAGE = 700
const DEFAULT_LLM_DOCUMENT_IMAGE_INPUT_TOKENS = 700
const DEFAULT_LLM_DOCUMENT_TEXT_INPUT_TOKENS = 900
const DEFAULT_LLM_DOCUMENT_DOCX_INPUT_TOKENS = 1_200
const DEFAULT_TEXT_BYTES_PER_TOKEN = 4

function roundRate(value: number): number {
  return Number(value.toFixed(10))
}

function buildVariantMap(input: number | Record<string, number>, fallbackVariant: string): VariantMap {
  if (typeof input === 'number') {
    return {
      defaultVariant: fallbackVariant,
      values: {
        [fallbackVariant]: input
      }
    }
  }

  const entries = Object.entries(input)
  const first = entries[0]
  if (!first) {
    return {
      defaultVariant: fallbackVariant,
      values: {
        [fallbackVariant]: 0
      }
    }
  }

  return {
    defaultVariant: first[0],
    values: Object.fromEntries(entries)
  }
}

function getLLMTokenHeuristic(
  modelCost?: TokenCostShape | undefined,
  overrides?: LLMEstimationHeuristicShape | undefined
): {
  defaultInputMinutes: number
  inputTokensPerMinute: number
  outputTokensPerPrompt: number
  documentInputTokensPerPage: number
  documentImageInputTokens: number
  documentDefaultTextInputTokens: number
  documentDefaultDocxInputTokens: number
  documentTextBytesPerToken: number
} {
  const isExpensiveModel = (modelCost?.output ?? 0) >= 50

  return {
    defaultInputMinutes: overrides?.defaultInputMinutes ?? DEFAULT_LLM_INPUT_MINUTES,
    inputTokensPerMinute: overrides?.inputTokensPerMinute ?? (DEFAULT_LLM_INPUT_TOKENS_PER_MINUTE * (isExpensiveModel ? 5 : 1)),
    outputTokensPerPrompt: overrides?.outputTokensPerPrompt ?? (DEFAULT_LLM_OUTPUT_TOKENS_PER_PROMPT * (isExpensiveModel ? 8 : 1)),
    documentInputTokensPerPage: overrides?.documentInputTokensPerPage ?? DEFAULT_LLM_DOCUMENT_INPUT_TOKENS_PER_PAGE,
    documentImageInputTokens: overrides?.documentImageInputTokens ?? DEFAULT_LLM_DOCUMENT_IMAGE_INPUT_TOKENS,
    documentDefaultTextInputTokens: overrides?.documentDefaultTextInputTokens ?? DEFAULT_LLM_DOCUMENT_TEXT_INPUT_TOKENS,
    documentDefaultDocxInputTokens: overrides?.documentDefaultDocxInputTokens ?? DEFAULT_LLM_DOCUMENT_DOCX_INPUT_TOKENS,
    documentTextBytesPerToken: overrides?.documentTextBytesPerToken ?? DEFAULT_TEXT_BYTES_PER_TOKEN
  }
}

function estimateDocumentTokens(
  spec: DocumentTokenEstimationSpec,
  context: ModelEstimationContext
): TokenHeuristic {
  const documentType = context.documentType
  const pages = Math.max(1, Math.round(context.documentPages ?? spec.defaultPages))
  const inputBytes = Math.max(0, Math.round(context.inputBytes ?? 0))

  let inputTokens = spec.defaultTextInputTokens

  if (documentType === 'pdf') {
    inputTokens = pages * spec.pdfInputTokensPerPage
  } else if (documentType === 'png' || documentType === 'jpg' || documentType === 'tiff') {
    inputTokens = spec.imageInputTokensPerImage
  } else if (documentType === 'docx' || documentType === 'pptx' || documentType === 'xlsx') {
    const estimatedFromBytes = inputBytes > 0
      ? Math.ceil(inputBytes / spec.textBytesPerToken)
      : spec.defaultDocxInputTokens
    inputTokens = Math.max(spec.defaultDocxInputTokens, estimatedFromBytes)
  } else if (documentType === 'txt') {
    const estimatedFromBytes = inputBytes > 0
      ? Math.ceil(inputBytes / spec.textBytesPerToken)
      : spec.defaultTextInputTokens
    inputTokens = Math.max(spec.defaultTextInputTokens, estimatedFromBytes)
  }

  return {
    inputTokens,
    outputTokens: Math.ceil(inputTokens * spec.outputToInputRatio)
  }
}

function getPromptCount(context: ModelEstimationContext, fallback = 1): number {
  return Math.max(1, Math.round(context.promptCount ?? fallback))
}

function getOutputSeconds(context: ModelEstimationContext, fallback: number): number {
  return Math.max(1, context.outputSeconds ?? fallback)
}

function buildOCRDocumentModelCostEstimation(
  model: OCRDocumentModelShape
): ModelEstimation['cost'] {
  return {
    kind: 'document-ocr',
    defaultPages: DEFAULT_DOCUMENT_PAGE_COUNT,
    perPageUsd: model.costPerPage ?? 0
  }
}

function buildVideoModelCostEstimation(
  model: VideoModelShape
): ModelEstimation['cost'] {
  return {
    kind: 'video',
    baseUsdPerPrompt: 0,
    perOutputSecondUsd: model.costPerSecond ?? 0
  }
}

const DEFAULT_FIXED_OVERHEAD_FRACTION = 0.25

function getSpeedOperationProfile(
  profile: SpeedProfile,
  operation: SpeedOperationKey
) {
  const timing = profile[operation]
  if (!timing) {
    throw new Error(`Missing ${operation} speed profile`)
  }

  return timing
}

function buildTokenDurationCoefficients(
  baselineMs: number,
  baselineInputTokens: number,
  baselineOutputTokens: number
): {
  fixedOverheadMs: number
  perInputTokenMs: number
  perOutputTokenMs: number
} {
  const fixedOverheadMs = Math.round(baselineMs * DEFAULT_FIXED_OVERHEAD_FRACTION)
  const variableMs = Math.max(0, baselineMs - fixedOverheadMs)
  const totalTokens = Math.max(1, baselineInputTokens + baselineOutputTokens)
  const perTokenMs = roundRate(variableMs / totalTokens)

  return {
    fixedOverheadMs,
    perInputTokenMs: perTokenMs,
    perOutputTokenMs: perTokenMs
  }
}

function buildCharacterDurationCoefficients(
  baselineMs: number,
  defaultCharacters: number
): {
  fixedOverheadMs: number
  perCharacterMs: number
} {
  const fixedOverheadMs = Math.round(baselineMs * DEFAULT_FIXED_OVERHEAD_FRACTION)
  const variableMs = Math.max(0, baselineMs - fixedOverheadMs)

  return {
    fixedOverheadMs,
    perCharacterMs: roundRate(variableMs / Math.max(1, defaultCharacters))
  }
}

function buildDurationVariantMap(costMap: VariantMap, baselineMs: number): VariantMap {
  const defaultMs = Math.round(baselineMs)
  const baseCost = costMap.values[costMap.defaultVariant] ?? 1

  return {
    defaultVariant: costMap.defaultVariant,
    values: Object.fromEntries(
      Object.entries(costMap.values).map(([variant, cost]) => {
        const multiplier = baseCost > 0 ? cost / baseCost : 1
        return [variant, Math.round(defaultMs * multiplier)]
      })
    )
  }
}

export function estimateModelDurationMs(
  estimation: ModelEstimation,
  context: ModelEstimationContext
): number {
  const { duration } = estimation

  switch (duration.kind) {
    case 'transcription': {
      const inputMinutes = Math.max(0, context.inputMinutes ?? 0)
      return Math.round(duration.baseMs + (inputMinutes * duration.perInputMinuteMs))
    }
    case 'llm': {
      const { inputTokens, outputTokens } = estimateLLMTokens(duration, context)
      const totalMs =
        duration.fixedOverheadMs
        + (inputTokens * duration.perInputTokenMs)
        + (outputTokens * duration.perOutputTokenMs)
      return Math.round(totalMs)
    }
    case 'document-ocr': {
      const pages = Math.max(1, Math.round(context.documentPages ?? duration.defaultPages))
      return Math.round(duration.baseMs + (pages * duration.perPageMs))
    }
    case 'document-llm': {
      const { inputTokens, outputTokens } = estimateDocumentTokens(duration, context)
      const totalMs =
        duration.fixedOverheadMs
        + (inputTokens * duration.perInputTokenMs)
        + (outputTokens * duration.perOutputTokenMs)
      return Math.round(totalMs)
    }
    case 'tts': {
      const characters = Math.max(1, Math.round(context.characters ?? duration.defaultCharacters))
      const totalMs = duration.fixedOverheadMs + (characters * duration.perCharacterMs)
      return Math.round(totalMs)
    }
    case 'image': {
      const promptCount = getPromptCount(context, DEFAULT_IMAGE_PROMPT_COUNT)
      const msPerPrompt = getResolvedImageValue(duration, context)
      return Math.round(promptCount * msPerPrompt)
    }
    case 'music': {
      const outputSeconds = getOutputSeconds(context, DEFAULT_MUSIC_DURATION_SECONDS)
      const totalMs = duration.baseMs + (outputSeconds * duration.perOutputSecondMs)
      return Math.round(totalMs)
    }
    case 'video': {
      const outputSeconds = getOutputSeconds(context, DEFAULT_VIDEO_DURATION_SECONDS)
      const promptCount = getPromptCount(context, DEFAULT_VIDEO_PROMPT_COUNT)
      const msPerPrompt = duration.baseMsPerPrompt + (outputSeconds * duration.perOutputSecondMs)
      return Math.round(promptCount * msPerPrompt)
    }
  }
}

export function attachModelEstimations<M extends { id: string }>(
  models: readonly M[],
  buildEstimation: (model: M) => ModelEstimation
): Array<M & { estimation: ModelEstimation }> {
  return models.map((model) => {
    return {
      ...model,
      estimation: buildEstimation(model)
    }
  })
}

function buildTranscriptionModelDurationEstimation(
  model: TranscriptionModelShape
): ModelEstimation['duration'] {
  const speed = getSpeedOperationProfile(model.speedProfile, 'transcription')

  return {
    kind: 'transcription',
    baseMs: speed.baseMs,
    perInputMinuteMs: speed.perInputMinuteMs ?? 0
  }
}

function buildLLMModelDurationEstimation(
  model: LLMModelShape
): ModelEstimation['duration'] {
  const speed = getSpeedOperationProfile(model.speedProfile, 'llm')
  const tokenHeuristic = getLLMTokenHeuristic(model.cost, model.estimationHeuristics)
  const duration = buildTokenDurationCoefficients(
    speed.baseMs,
    tokenHeuristic.defaultInputMinutes * tokenHeuristic.inputTokensPerMinute,
    tokenHeuristic.outputTokensPerPrompt
  )

  return {
    kind: 'llm',
    defaultInputMinutes: tokenHeuristic.defaultInputMinutes,
    fixedOverheadMs: duration.fixedOverheadMs,
    inputTokensPerMinute: tokenHeuristic.inputTokensPerMinute,
    outputTokensPerPrompt: tokenHeuristic.outputTokensPerPrompt,
    documentInputTokensPerPage: tokenHeuristic.documentInputTokensPerPage,
    documentImageInputTokens: tokenHeuristic.documentImageInputTokens,
    documentDefaultTextInputTokens: tokenHeuristic.documentDefaultTextInputTokens,
    documentDefaultDocxInputTokens: tokenHeuristic.documentDefaultDocxInputTokens,
    documentTextBytesPerToken: tokenHeuristic.documentTextBytesPerToken,
    perInputTokenMs: duration.perInputTokenMs,
    perOutputTokenMs: duration.perOutputTokenMs
  }
}

function buildOCRDocumentModelDurationEstimation(
  model: OCRDocumentModelShape
): ModelEstimation['duration'] {
  const speed = getSpeedOperationProfile(model.speedProfile, 'document')

  return {
    kind: 'document-ocr',
    defaultPages: DEFAULT_DOCUMENT_PAGE_COUNT,
    baseMs: speed.baseMs,
    perPageMs: speed.perPageMs ?? 0
  }
}

function buildLLMDocumentModelDurationEstimation(
  model: LLMModelShape
): ModelEstimation['duration'] {
  const speed = getSpeedOperationProfile(model.speedProfile, 'document')
  const heuristic = getLLMTokenHeuristic(model.cost, model.estimationHeuristics)
  const baselineInputTokens = heuristic.documentInputTokensPerPage
  const baselineOutputTokens = heuristic.documentInputTokensPerPage
  const duration = buildTokenDurationCoefficients(speed.baseMs + (speed.perPageMs ?? 0), baselineInputTokens, baselineOutputTokens)

  return {
    kind: 'document-llm',
    defaultPages: DEFAULT_DOCUMENT_PAGE_COUNT,
    fixedOverheadMs: duration.fixedOverheadMs,
    textBytesPerToken: heuristic.documentTextBytesPerToken,
    pdfInputTokensPerPage: heuristic.documentInputTokensPerPage,
    imageInputTokensPerImage: heuristic.documentImageInputTokens,
    defaultTextInputTokens: heuristic.documentDefaultTextInputTokens,
    defaultDocxInputTokens: heuristic.documentDefaultDocxInputTokens,
    outputToInputRatio: 1,
    perInputTokenMs: duration.perInputTokenMs,
    perOutputTokenMs: duration.perOutputTokenMs
  }
}

function buildTTSModelDurationEstimation(
  model: TTSModelShape
): ModelEstimation['duration'] {
  const speed = getSpeedOperationProfile(model.speedProfile, 'tts')
  const duration = buildCharacterDurationCoefficients(speed.baseMs, DEFAULT_TTS_CHARACTERS)

  return {
    kind: 'tts',
    defaultCharacters: DEFAULT_TTS_CHARACTERS,
    fixedOverheadMs: duration.fixedOverheadMs,
    perCharacterMs: duration.perCharacterMs
  }
}

function buildImageModelDurationEstimation(
  model: ImageModelShape
): ModelEstimation['duration'] {
  const speed = getSpeedOperationProfile(model.speedProfile, 'image')
  const costMap = buildVariantMap(model.costPerImage, 'default')
  const durationMap = buildDurationVariantMap(costMap, speed.baseMs)

  return {
    kind: 'image',
    defaultVariant: durationMap.defaultVariant,
    msPerPrompt: durationMap.values[durationMap.defaultVariant] ?? speed.baseMs,
    msPerPromptByVariant: durationMap.values
  }
}

function buildMusicModelDurationEstimation(
  model: MusicModelShape
): ModelEstimation['duration'] {
  const speed = getSpeedOperationProfile(model.speedProfile, 'music')

  return {
    kind: 'music',
    baseMs: speed.baseMs,
    perOutputSecondMs: speed.perOutputSecondMs ?? 0
  }
}

function buildVideoModelDurationEstimation(
  model: VideoModelShape
): ModelEstimation['duration'] {
  const speed = getSpeedOperationProfile(model.speedProfile, 'video')

  return {
    kind: 'video',
    baseMsPerPrompt: speed.baseMs,
    perOutputSecondMs: speed.perOutputSecondMs ?? 0
  }
}

export function buildTranscriptionModelEstimation(
  model: TranscriptionModelShape
): ModelEstimation {
  return {
    cost: buildTranscriptionModelCostEstimation(model),
    duration: buildTranscriptionModelDurationEstimation(model)
  }
}

export function buildLLMModelEstimation(
  model: LLMModelShape
): ModelEstimation {
  return {
    cost: buildLLMModelCostEstimation(model),
    duration: buildLLMModelDurationEstimation(model)
  }
}

export function buildOCRDocumentModelEstimation(
  model: OCRDocumentModelShape
): ModelEstimation {
  return {
    cost: buildOCRDocumentModelCostEstimation(model),
    duration: buildOCRDocumentModelDurationEstimation(model)
  }
}

export function buildLLMDocumentModelEstimation(
  model: LLMModelShape
): ModelEstimation {
  return {
    cost: buildLLMDocumentModelCostEstimation(model),
    duration: buildLLMDocumentModelDurationEstimation(model)
  }
}

export function buildTTSModelEstimation(
  model: TTSModelShape
): ModelEstimation {
  return {
    cost: buildTTSModelCostEstimation(model),
    duration: buildTTSModelDurationEstimation(model)
  }
}

export function buildImageModelEstimation(
  model: ImageModelShape
): ModelEstimation {
  return {
    cost: buildImageModelCostEstimation(model),
    duration: buildImageModelDurationEstimation(model)
  }
}

export function buildMusicModelEstimation(
  model: MusicModelShape
): ModelEstimation {
  return {
    cost: buildMusicModelCostEstimation(model),
    duration: buildMusicModelDurationEstimation(model)
  }
}

export function buildVideoModelEstimation(
  model: VideoModelShape
): ModelEstimation {
  return {
    cost: buildVideoModelCostEstimation(model),
    duration: buildVideoModelDurationEstimation(model)
  }
}

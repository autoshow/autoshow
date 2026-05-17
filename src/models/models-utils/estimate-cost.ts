import type {
SourceModelsModelsUtilsEstimateCostDocumentTokenEstimationSpec as DocumentTokenEstimationSpec,
SourceModelsModelsUtilsEstimateCostImageModelShape as ImageModelShape,
SourceModelsModelsUtilsEstimateCostImageValueEstimationSpec as ImageValueEstimationSpec,
LLMCostEstimation,
SourceModelsModelsUtilsEstimateCostLLMEstimationHeuristicShape as LLMEstimationHeuristicShape,
SourceModelsModelsUtilsEstimateCostLLMModelShape as LLMModelShape,
SourceModelsModelsUtilsEstimateCostLLMTokenEstimationSpec as LLMTokenEstimationSpec,
ModelEstimation,
SourceModelsModelsUtilsEstimateCostModelEstimationContext as ModelEstimationContext,
SourceModelsModelsUtilsEstimateCostMusicModelShape as MusicModelShape,
SourceModelsModelsUtilsEstimateCostTokenCostShape as TokenCostShape,
SourceModelsModelsUtilsEstimateCostTokenHeuristic as TokenHeuristic,
SourceModelsModelsUtilsEstimateCostTranscriptionModelShape as TranscriptionModelShape,
SourceModelsModelsUtilsEstimateCostTTSModelShape as TTSModelShape,
SourceModelsModelsUtilsEstimateCostVariantMap as VariantMap
} from '~/types'

function getOutputSeconds(context: ModelEstimationContext, fallback: number): number {
  return Math.max(1, context.outputSeconds ?? fallback)
}

function getPromptCount(context: ModelEstimationContext, fallback = 1): number {
  return Math.max(1, Math.round(context.promptCount ?? fallback))
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

function roundRate(value: number): number {
  return Number(value.toFixed(10))
}

const DEFAULT_LLM_INPUT_TOKENS_PER_MINUTE = 200
const DEFAULT_LLM_OUTPUT_TOKENS_PER_PROMPT = 500
const DEFAULT_LLM_INPUT_MINUTES = 1
const DEFAULT_LLM_DOCUMENT_INPUT_TOKENS_PER_PAGE = 700
const DEFAULT_LLM_DOCUMENT_IMAGE_INPUT_TOKENS = 700
const DEFAULT_LLM_DOCUMENT_TEXT_INPUT_TOKENS = 900
const DEFAULT_LLM_DOCUMENT_DOCX_INPUT_TOKENS = 1_200
const DEFAULT_TEXT_BYTES_PER_TOKEN = 4

export const DEFAULT_TTS_CHARACTERS = 1_500
export const DEFAULT_DOCUMENT_PAGE_COUNT = 1
export const DEFAULT_IMAGE_PROMPT_COUNT = 1
export const DEFAULT_MUSIC_DURATION_SECONDS = 30
export const DEFAULT_VIDEO_DURATION_SECONDS = 8
export const DEFAULT_VIDEO_PROMPT_COUNT = 1

function getResolvedVariant(
  spec: { defaultVariant: string },
  context: ModelEstimationContext
): string {
  return context.variant || spec.defaultVariant
}

export function getResolvedImageValue(
  spec: ImageValueEstimationSpec,
  context: ModelEstimationContext
): number {
  const resolvedVariant = getResolvedVariant(spec, context)
  const fallbackKey = spec.defaultVariant

  if ('usdPerPromptByVariant' in spec) {
    return spec.usdPerPromptByVariant[resolvedVariant]
      ?? spec.usdPerPromptByVariant[fallbackKey]
      ?? spec.usdPerPrompt
  }

  return spec.msPerPromptByVariant[resolvedVariant]
    ?? spec.msPerPromptByVariant[fallbackKey]
    ?? spec.msPerPrompt
}
function estimateLLMInputTokens(
  spec: LLMTokenEstimationSpec,
  context: ModelEstimationContext
): number {
  if (context.inputTokens != null) {
    return Math.max(0, Math.round(context.inputTokens))
  }

  const promptInputTokens = Math.max(0, Math.round(context.promptInputTokens ?? 0))
  const inputBytes = Math.max(0, Math.round(context.inputBytes ?? 0))
  const pages = Math.max(1, Math.round(context.documentPages ?? DEFAULT_DOCUMENT_PAGE_COUNT))
  const textBytesPerToken = spec.documentTextBytesPerToken ?? DEFAULT_TEXT_BYTES_PER_TOKEN

  let sourceInputTokens: number | null = null

  if (context.documentType === 'pdf') {
    sourceInputTokens = pages * (spec.documentInputTokensPerPage ?? DEFAULT_LLM_DOCUMENT_INPUT_TOKENS_PER_PAGE)
  } else if (context.documentType === 'png' || context.documentType === 'jpg' || context.documentType === 'tiff') {
    sourceInputTokens = spec.documentImageInputTokens ?? DEFAULT_LLM_DOCUMENT_IMAGE_INPUT_TOKENS
  } else if (context.documentType === 'docx' || context.documentType === 'pptx' || context.documentType === 'xlsx') {
    const fallbackTokens = spec.documentDefaultDocxInputTokens ?? DEFAULT_LLM_DOCUMENT_DOCX_INPUT_TOKENS
    const estimatedFromBytes = inputBytes > 0 ? Math.ceil(inputBytes / textBytesPerToken) : fallbackTokens
    sourceInputTokens = Math.max(fallbackTokens, estimatedFromBytes)
  } else if (context.documentType === 'txt') {
    const fallbackTokens = spec.documentDefaultTextInputTokens ?? DEFAULT_LLM_DOCUMENT_TEXT_INPUT_TOKENS
    const estimatedFromBytes = inputBytes > 0 ? Math.ceil(inputBytes / textBytesPerToken) : fallbackTokens
    sourceInputTokens = Math.max(fallbackTokens, estimatedFromBytes)
  } else if (context.sourceType === 'document') {
    sourceInputTokens = spec.documentDefaultTextInputTokens ?? DEFAULT_LLM_DOCUMENT_TEXT_INPUT_TOKENS
  }

  if (sourceInputTokens == null) {
    const inputMinutes = Math.max(0, context.inputMinutes ?? spec.defaultInputMinutes)
    sourceInputTokens = inputMinutes * spec.inputTokensPerMinute
  }

  return Math.max(0, Math.round(sourceInputTokens + promptInputTokens))
}

function estimateLLMOutputTokens(
  spec: Pick<LLMCostEstimation, 'outputTokensPerPrompt'>,
  context: ModelEstimationContext
): number {
  if (context.outputTokens != null) {
    return Math.max(0, Math.round(context.outputTokens))
  }

  if (context.promptOutputTokens != null) {
    return Math.max(0, Math.round(context.promptOutputTokens))
  }

  return Math.max(0, Math.round(getPromptCount(context) * spec.outputTokensPerPrompt))
}

export function estimateLLMTokens(
  spec: LLMTokenEstimationSpec,
  context: ModelEstimationContext
): TokenHeuristic {
  return {
    inputTokens: estimateLLMInputTokens(spec, context),
    outputTokens: estimateLLMOutputTokens(spec, context)
  }
}
export function estimateModelCostUsd(
  estimation: ModelEstimation,
  context: ModelEstimationContext
): number {
  const { cost } = estimation

  switch (cost.kind) {
    case 'transcription': {
      const inputMinutes = Math.max(0, context.inputMinutes ?? 0)
      const billedMinutes = Math.max(
        cost.billedMinutesMinimum,
        Math.ceil(inputMinutes)
      )
      return billedMinutes * cost.perInputMinuteUsd
    }
    case 'llm': {
      const { inputTokens, outputTokens } = estimateLLMTokens(cost, context)
      return (inputTokens * cost.inputUsdPerMillionTokens + outputTokens * cost.outputUsdPerMillionTokens) / 1_000_000
    }
    case 'document-ocr': {
      const pages = Math.max(1, Math.round(context.documentPages ?? cost.defaultPages))
      return pages * cost.perPageUsd
    }
    case 'document-llm': {
      const { inputTokens, outputTokens } = estimateDocumentTokens(cost, context)
      return (inputTokens * cost.inputUsdPerMillionTokens + outputTokens * cost.outputUsdPerMillionTokens) / 1_000_000
    }
    case 'tts': {
      const characters = Math.max(1, Math.round(context.characters ?? cost.defaultCharacters))
      return characters * cost.usdPerCharacter
    }
    case 'image': {
      const promptCount = getPromptCount(context, DEFAULT_IMAGE_PROMPT_COUNT)
      const usdPerPrompt = getResolvedImageValue(cost, context)
      return promptCount * usdPerPrompt
    }
    case 'music': {
      const outputSeconds = getOutputSeconds(context, DEFAULT_MUSIC_DURATION_SECONDS)
      return outputSeconds * cost.perOutputSecondUsd
    }
    case 'video': {
      const outputSeconds = getOutputSeconds(context, DEFAULT_VIDEO_DURATION_SECONDS)
      const promptCount = getPromptCount(context, DEFAULT_VIDEO_PROMPT_COUNT)
      const usdPerPrompt = cost.baseUsdPerPrompt + (outputSeconds * cost.perOutputSecondUsd)
      return promptCount * usdPerPrompt
    }
  }
}

export function buildTranscriptionModelCostEstimation(
  model: TranscriptionModelShape
): ModelEstimation['cost'] {
  return {
    kind: 'transcription',
    billedMinutesMinimum: 1,
    perInputMinuteUsd: roundRate((model.centicentsPerMin ?? 0) / 10_000)
  }
}

export function buildLLMModelCostEstimation(
  model: LLMModelShape
): ModelEstimation['cost'] {
  const tokenHeuristic = getLLMTokenHeuristic(model.cost, model.estimationHeuristics)

  return {
    kind: 'llm',
    defaultInputMinutes: tokenHeuristic.defaultInputMinutes,
    inputTokensPerMinute: tokenHeuristic.inputTokensPerMinute,
    outputTokensPerPrompt: tokenHeuristic.outputTokensPerPrompt,
    documentInputTokensPerPage: tokenHeuristic.documentInputTokensPerPage,
    documentImageInputTokens: tokenHeuristic.documentImageInputTokens,
    documentDefaultTextInputTokens: tokenHeuristic.documentDefaultTextInputTokens,
    documentDefaultDocxInputTokens: tokenHeuristic.documentDefaultDocxInputTokens,
    documentTextBytesPerToken: tokenHeuristic.documentTextBytesPerToken,
    inputUsdPerMillionTokens: model.cost?.input ?? 0,
    outputUsdPerMillionTokens: model.cost?.output ?? 0
  }
}
export function buildLLMDocumentModelCostEstimation(
  model: LLMModelShape
): ModelEstimation['cost'] {
  const heuristic = getLLMTokenHeuristic(model.cost, model.estimationHeuristics)

  return {
    kind: 'document-llm',
    defaultPages: DEFAULT_DOCUMENT_PAGE_COUNT,
    textBytesPerToken: heuristic.documentTextBytesPerToken,
    pdfInputTokensPerPage: heuristic.documentInputTokensPerPage,
    imageInputTokensPerImage: heuristic.documentImageInputTokens,
    defaultTextInputTokens: heuristic.documentDefaultTextInputTokens,
    defaultDocxInputTokens: heuristic.documentDefaultDocxInputTokens,
    outputToInputRatio: 1,
    inputUsdPerMillionTokens: model.cost?.input ?? 0,
    outputUsdPerMillionTokens: model.cost?.output ?? 0
  }
}

export function buildTTSModelCostEstimation(
  model: TTSModelShape
): ModelEstimation['cost'] {
  return {
    kind: 'tts',
    defaultCharacters: DEFAULT_TTS_CHARACTERS,
    usdPerCharacter: roundRate((model.costPerMillionChars ?? 0) / 1_000_000)
  }
}

export function buildImageModelCostEstimation(
  model: ImageModelShape
): ModelEstimation['cost'] {
  const costMap = buildVariantMap(model.costPerImage, 'default')

  return {
    kind: 'image',
    defaultVariant: costMap.defaultVariant,
    usdPerPrompt: costMap.values[costMap.defaultVariant] ?? 0,
    usdPerPromptByVariant: costMap.values
  }
}

export function buildMusicModelCostEstimation(
  model: MusicModelShape
): ModelEstimation['cost'] {
  return {
    kind: 'music',
    perOutputSecondUsd: roundRate(model.costPerMinute / 60)
  }
}

import type { ImageCostEstimation,SpeedProfile,SupportedDocumentType } from '~/types'
export type SourceModelsModelsUtilsEstimateCostTokenCostShape = {
  input: number
  output: number
}

export type SourceModelsModelsUtilsEstimateCostTranscriptionModelShape = {
  id: string
  speedProfile: SpeedProfile
  centicentsPerMin?: number | undefined
}

export type SourceModelsModelsUtilsEstimateCostLLMModelShape = {
  id: string
  speedProfile: SpeedProfile
  cost?: SourceModelsModelsUtilsEstimateCostTokenCostShape | undefined
  estimationHeuristics?: SourceModelsModelsUtilsEstimateCostLLMEstimationHeuristicShape | undefined
}

export type SourceModelsModelsUtilsEstimateCostOCRDocumentModelShape = {
  id: string
  speedProfile: SpeedProfile
  costPerPage?: number | undefined
}

export type SourceModelsModelsUtilsEstimateCostTTSModelShape = {
  id: string
  speedProfile: SpeedProfile
  costPerMillionChars?: number | undefined
}

export type SourceModelsModelsUtilsEstimateCostImageModelShape = {
  id: string
  speedProfile: SpeedProfile
  costPerImage: number | Record<string, number>
}

export type SourceModelsModelsUtilsEstimateCostMusicModelShape = {
  id: string
  speedProfile: SpeedProfile
  costPerMinute: number
}

export type SourceModelsModelsUtilsEstimateCostVideoModelShape = {
  id: string
  speedProfile: SpeedProfile
  costPerSecond?: number | undefined
}

export type SourceModelsModelsUtilsEstimateCostModelEstimationContext = {
  sourceType?: 'local' | 'direct-file' | 'streaming' | 'document'
  inputMinutes?: number | undefined
  inputTokens?: number | undefined
  outputTokens?: number | undefined
  promptInputTokens?: number | undefined
  promptOutputTokens?: number | undefined
  documentPages?: number | undefined
  inputBytes?: number | undefined
  documentType?: SupportedDocumentType | undefined
  promptCount?: number | undefined
  characters?: number | undefined
  outputSeconds?: number | undefined
  variant?: string | undefined
}

export type SourceModelsModelsUtilsEstimateCostVariantMap = {
  defaultVariant: string
  values: Record<string, number>
}

export type SourceModelsModelsUtilsEstimateCostTokenHeuristic = {
  inputTokens: number
  outputTokens: number
}

export type SourceModelsModelsUtilsEstimateCostLLMEstimationHeuristicShape = {
  defaultInputMinutes?: number | undefined
  inputTokensPerMinute?: number | undefined
  outputTokensPerPrompt?: number | undefined
  documentInputTokensPerPage?: number | undefined
  documentImageInputTokens?: number | undefined
  documentDefaultTextInputTokens?: number | undefined
  documentDefaultDocxInputTokens?: number | undefined
  documentTextBytesPerToken?: number | undefined
}

export type SourceModelsModelsUtilsEstimateCostLLMTokenEstimationSpec = {
  defaultInputMinutes: number
  inputTokensPerMinute: number
  outputTokensPerPrompt: number
  documentInputTokensPerPage?: number | undefined
  documentImageInputTokens?: number | undefined
  documentDefaultTextInputTokens?: number | undefined
  documentDefaultDocxInputTokens?: number | undefined
  documentTextBytesPerToken?: number | undefined
}

export type SourceModelsModelsUtilsEstimateCostDocumentTokenEstimationSpec = {
  defaultPages: number
  textBytesPerToken: number
  pdfInputTokensPerPage: number
  imageInputTokensPerImage: number
  defaultTextInputTokens: number
  defaultDocxInputTokens: number
  outputToInputRatio: number
}

export type SourceModelsModelsUtilsEstimateCostImageValueEstimationSpec =
  | Pick<ImageCostEstimation, 'defaultVariant' | 'usdPerPrompt' | 'usdPerPromptByVariant'>
  | {
    defaultVariant: string
    msPerPrompt: number
    msPerPromptByVariant: Record<string, number>
  }

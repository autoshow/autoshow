import type { SpeedProfile } from '~/types'
export type SourceModelsModelsUtilsEstimateSpeedTokenCostShape = {
  input: number
  output: number
}

export type SourceModelsModelsUtilsEstimateSpeedTokenHeuristic = {
  inputTokens: number
  outputTokens: number
}

export type SourceModelsModelsUtilsEstimateSpeedLLMEstimationHeuristicShape = {
  defaultInputMinutes?: number | undefined
  inputTokensPerMinute?: number | undefined
  outputTokensPerPrompt?: number | undefined
  documentInputTokensPerPage?: number | undefined
  documentImageInputTokens?: number | undefined
  documentDefaultTextInputTokens?: number | undefined
  documentDefaultDocxInputTokens?: number | undefined
  documentTextBytesPerToken?: number | undefined
}

export type SourceModelsModelsUtilsEstimateSpeedDocumentTokenEstimationSpec = {
  defaultPages: number
  textBytesPerToken: number
  pdfInputTokensPerPage: number
  imageInputTokensPerImage: number
  defaultTextInputTokens: number
  defaultDocxInputTokens: number
  outputToInputRatio: number
}

export type SourceModelsModelsUtilsEstimateSpeedSpeedOperationKey = keyof Pick<SpeedProfile, 'transcription' | 'llm' | 'document' | 'tts' | 'image' | 'music' | 'video'>

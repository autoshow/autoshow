import type { LLMServiceType } from '~/types'
export type SourceUtilsCostHelpersEstimatedDisplayCost = {
  usd: number
  centsLabel: string
}

export type SourceUtilsCostHelpersPromptTokenEstimate = {
  inputTokens: number
  outputTokens: number
}

export type SourceUtilsCostHelpersTokenCost = {
  input: number
  output: number
}

export type SourceUtilsCostHelpersAuxiliaryLLMEstimateOptions = {
  llmEnabled?: boolean | undefined
  llmService?: LLMServiceType | undefined
  llmModel?: string | undefined
  promptCount?: number | undefined
  sourceDurationSeconds?: number | undefined
}

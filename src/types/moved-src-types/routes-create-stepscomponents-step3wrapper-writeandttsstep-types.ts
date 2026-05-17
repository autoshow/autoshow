import type { SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate as CuratedModelCandidate,SourceUtilsCostHelpersEstimatedDisplayCost as EstimatedDisplayCost,LLMServiceType,PromptType,TTSConfig,TTSServiceType } from '~/types'
export type SourceRoutesCreateStepsComponentsStep3WrapperWriteAndTtsStepWriteMode = "skip" | "llm" | "tts-only"

export type SourceRoutesCreateStepsComponentsStep3WrapperWriteAndTtsStepProps = {
  stepNumber: number
  subStep: number
  llmEnabled: boolean
  ttsWithLlm: boolean
  writeModeSelected: boolean
  ttsDecisionMade: boolean
  setWriteMode: (mode: SourceRoutesCreateStepsComponentsStep3WrapperWriteAndTtsStepWriteMode) => void
  setTtsDecision: (enabled: boolean) => void
  selectedPrompts: string[]
  setSelectedPrompts: (prompts: string[]) => void
  llmCustomInstructions: string
  setLlmCustomInstructions: (value: string) => void
  llmService: LLMServiceType
  setLlmService: (value: LLMServiceType) => void
  llmModel: string
  llmModelSelected: boolean
  setLlmModel: (value: string) => void
  ttsService: string
  setTtsService: (value: string) => void
  ttsVoice: string
  ttsVoiceSelected: boolean
  setTtsVoice: (value: string) => void
  ttsModel: string
  ttsModelSelected: boolean
  setTtsModel: (value: string) => void
  disabled: boolean | undefined
  durationSeconds?: number | undefined
  mode?: 'job' | 'preset' | 'append-assets' | undefined
}

export type SourceRoutesCreateStepsComponentsStep3WrapperWriteAndTtsStepGroupedPromptEntry = [string, PromptType[]]

export type SourceRoutesCreateStepsComponentsStep3WrapperWriteAndTtsStepRankedLLMCandidate = CuratedModelCandidate & {
  displayCost: EstimatedDisplayCost | null
}

export type SourceRoutesCreateStepsComponentsStep3WrapperWriteAndTtsStepRankedTTSCandidate = CuratedModelCandidate & {
  displayCost: EstimatedDisplayCost | null
}

export type SourceRoutesCreateStepsComponentsStep3WrapperWriteAndTtsStepTTSEntry = [TTSServiceType, TTSConfig[TTSServiceType]]

import type { SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate as CuratedModelCandidate,SourceUtilsCostHelpersEstimatedDisplayCost as EstimatedDisplayCost,TranscriptionConfig,UrlMetadata } from '~/types'
export type SourceRoutesCreateStepsComponentsStep2WrapperTranscriptionProps = {
  transcriptionOption: string
  transcriptionModel: string
  transcriptionModelSelected: boolean
  selectTranscriptionService: (service: string) => void
  selectTranscriptionModel: (service: string, model: string) => void
  disabled: boolean | undefined
  durationSeconds?: number | undefined
  urlMetadata?: UrlMetadata | null | undefined
  showWhisperOptions: boolean
  showStreamingOptions: boolean
}

export type SourceRoutesCreateStepsComponentsStep2WrapperTranscriptionWhisperServiceKey = Extract<keyof TranscriptionConfig["whisper"], string>

export type SourceRoutesCreateStepsComponentsStep2WrapperTranscriptionDiarizationServiceKey = Extract<keyof TranscriptionConfig["diarization"], string>

export type SourceRoutesCreateStepsComponentsStep2WrapperTranscriptionSpeakerLabelMode = "none" | "without" | "with"

export type SourceRoutesCreateStepsComponentsStep2WrapperTranscriptionTranscriptionCandidate = CuratedModelCandidate & {
    cost: EstimatedDisplayCost | null
  }

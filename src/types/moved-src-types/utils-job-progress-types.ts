export type SourceUtilsJobProgressJobProgressStepNumber =
  | 1
  | 2
  | 3
  | 4

export type SourceUtilsJobProgressJobProgressTimingKey =
  | 'download'
  | 'transcription'
  | 'writeAndTts'
  | 'media'
  | 'contentSelection'
  | 'llm'
  | 'tts'
  | 'image'
  | 'music'
  | 'video'

export type SourceUtilsJobProgressJobProgressStage = {
  step: SourceUtilsJobProgressJobProgressStepNumber
  name: string
  weight: number
  timingKey: SourceUtilsJobProgressJobProgressTimingKey
}

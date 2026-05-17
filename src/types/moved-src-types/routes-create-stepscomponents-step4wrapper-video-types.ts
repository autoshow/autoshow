import type { LLMServiceType,VideoConfig,VideoGenServiceType } from '~/types'
export type SourceRoutesCreateStepsComponentsStep4WrapperVideoVideoEntry = [VideoGenServiceType, NonNullable<VideoConfig[VideoGenServiceType]>]

export type SourceRoutesCreateStepsComponentsStep4WrapperVideoProps = {
  videoService: VideoGenServiceType
  setVideoService: (service: VideoGenServiceType) => void
  selectedVideoPrompts: string[]
  videoPromptSelected: boolean
  setSelectedVideoPrompts: (prompts: string[]) => void
  videoModel: string
  videoModelSelected: boolean
  setVideoModel: (model: string) => void
  videoSize: string
  videoSizeSelected: boolean
  setVideoSize: (size: string) => void
  videoDuration: number
  videoDurationSelected: boolean
  setVideoDuration: (duration: number) => void
  videoAspectRatio: string
  videoAspectRatioSelected: boolean
  setVideoAspectRatio: (ratio: string) => void
  videoCustomInstructions: string
  setVideoCustomInstructions: (value: string) => void
  disabled: boolean | undefined
  llmEnabled: boolean
  llmService: LLMServiceType
  llmModel: string
  sourceDurationSeconds?: number | undefined
}

import type { VideoGenServiceType } from '~/types'
export type SourceRoutesCreateStepsComponentsStep4WrapperVideoOptionsVideoSize = {
  id: string
  name: string
  description: string
}

export type SourceRoutesCreateStepsComponentsStep4WrapperVideoOptionsProps = {
  videoService: VideoGenServiceType
  videoSize: string
  videoSizeSelected: boolean
  setVideoSize: (size: string) => void
  videoDuration: number
  videoDurationSelected: boolean
  setVideoDuration: (duration: number) => void
  videoAspectRatio: string
  videoAspectRatioSelected: boolean
  setVideoAspectRatio: (ratio: string) => void
  disabled: boolean | undefined
  sizes: SourceRoutesCreateStepsComponentsStep4WrapperVideoOptionsVideoSize[]
  durations: number[]
  aspectRatios?: string[] | undefined
  fieldsetClass?: string | undefined
}

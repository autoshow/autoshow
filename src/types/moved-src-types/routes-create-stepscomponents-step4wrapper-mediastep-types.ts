import type { ImageGenServiceType,LLMServiceType,MusicBitrate,MusicPreset,MusicSampleRate,MusicServiceType,VideoGenServiceType } from '~/types'
export type SourceRoutesCreateStepsComponentsStep4WrapperMediaStepMediaSubStep = "decision" | "image" | "video" | "music"

export type SourceRoutesCreateStepsComponentsStep4WrapperMediaStepProps = {
  stepNumber: number
  currentSubStep: SourceRoutesCreateStepsComponentsStep4WrapperMediaStepMediaSubStep
  imageEnabled: boolean
  mediaDecisionSelected: boolean
  setImageEnabled: (value: boolean) => void
  selectedImagePrompts: string[]
  imagePromptSelected: boolean
  setSelectedImagePrompts: (prompts: string[]) => void
  imageService: ImageGenServiceType
  setImageService: (service: ImageGenServiceType) => void
  imageModel: string
  imageModelSelected: boolean
  setImageModel: (model: string) => void
  imageDimensionOrRatio: string
  imageDimensionSelected: boolean
  setImageDimensionOrRatio: (value: string) => void
  imageCustomInstructions: string
  setImageCustomInstructions: (value: string) => void
  musicEnabled: boolean
  setMusicEnabled: (value: boolean) => void
  musicService: MusicServiceType
  setMusicService: (service: MusicServiceType) => void
  musicModel: string
  musicModelSelected: boolean
  setMusicModel: (model: string) => void
  selectedMusicGenre: string
  musicGenreSelected: boolean
  setSelectedMusicGenre: (genre: string) => void
  musicPreset: MusicPreset
  musicPresetSelected: boolean
  setMusicPreset: (preset: MusicPreset) => void
  musicDurationSeconds: number
  musicDurationSelected: boolean
  setMusicDurationSeconds: (seconds: number) => void
  musicInstrumental: boolean
  setMusicInstrumental: (value: boolean) => void
  musicSampleRate: MusicSampleRate | undefined
  setMusicSampleRate: (value: MusicSampleRate | undefined) => void
  musicBitrate: MusicBitrate | undefined
  setMusicBitrate: (value: MusicBitrate | undefined) => void
  musicCustomInstructions: string
  setMusicCustomInstructions: (value: string) => void
  videoEnabled: boolean
  setVideoEnabled: (value: boolean) => void
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

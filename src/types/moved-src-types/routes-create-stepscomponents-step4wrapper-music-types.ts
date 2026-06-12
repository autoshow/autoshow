import type { LLMServiceType,MusicBitrate,MusicConfig,MusicPreset,MusicSampleRate,MusicServiceType } from '~/types'
export type SourceRoutesCreateStepsComponentsStep4WrapperMusicMusicEntry = [MusicServiceType, MusicConfig[MusicServiceType]]

export type SourceRoutesCreateStepsComponentsStep4WrapperMusicProps = {
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
  disabled: boolean | undefined
  llmEnabled: boolean
  llmService: LLMServiceType
  llmModel: string
  sourceDurationSeconds?: number | undefined
}

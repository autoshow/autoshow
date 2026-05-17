import { isDocumentExtension } from '~/models'
import { createInitialStepsState } from '~/routes/create/create-state'
import type {
SourceRoutesPresetsPresetsCompatibilitySource as CompatibilitySource,PresetCompatibilityKey,
PresetConfig,
StepsState
} from '~/types'

const normalizeOptionalText = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export const normalizePresetName = (value: string): string => value.trim()

export const getPresetCompatibilityKeyForSource = (
  source: CompatibilitySource
): PresetCompatibilityKey | null => {
  if (source.documentType) {
    return 'document'
  }

  if (source.urlMetadata?.urlType === 'document') {
    return 'document'
  }

  if (source.uploadId && source.uploadedFileName) {
    return isDocumentExtension(source.uploadedFileName) ? 'document' : 'audio-file'
  }

  if (source.urlMetadata?.urlType === 'youtube' || source.urlMetadata?.urlType === 'streaming') {
    return 'audio-streaming'
  }

  if (source.urlMetadata?.urlType === 'direct-file') {
    return 'audio-file'
  }

  return null
}

export const buildPresetConfigFromState = (
  state: StepsState,
  compatibilityKey: PresetCompatibilityKey
): PresetConfig => normalizePresetConfig({
  compatibilityKey,
  transcriptionOption: compatibilityKey === 'document' ? undefined : state.transcriptionOption,
  transcriptionModel: compatibilityKey === 'document' ? undefined : state.transcriptionModel,
  documentService: compatibilityKey === 'document' ? state.documentService as PresetConfig['documentService'] : undefined,
  documentModel: compatibilityKey === 'document' ? state.documentModel as PresetConfig['documentModel'] : undefined,
  llmEnabled: state.llmEnabled,
  selectedPrompts: [...state.selectedPrompts],
  llmService: state.llmEnabled ? state.llmService : undefined,
  llmModel: state.llmEnabled ? state.llmModel : undefined,
  llmCustomInstructions: state.llmEnabled ? state.llmCustomInstructions : undefined,
  ttsWithLlm: state.ttsWithLlm,
  ttsService: state.ttsWithLlm ? state.ttsService as PresetConfig['ttsService'] : undefined,
  ttsVoice: state.ttsWithLlm ? state.ttsVoice : undefined,
  ttsModel: state.ttsWithLlm ? state.ttsModel : undefined,
  imageEnabled: state.imageEnabled,
  imageService: state.imageEnabled ? state.imageService : undefined,
  imageModel: state.imageEnabled ? state.imageModel : undefined,
  imageDimensionOrRatio: state.imageEnabled ? state.imageDimensionOrRatio : undefined,
  selectedImagePrompts: state.imageEnabled ? [...state.selectedImagePrompts] : [],
  imageCustomInstructions: state.imageEnabled ? state.imageCustomInstructions : undefined,
  musicEnabled: state.musicEnabled,
  musicService: state.musicEnabled ? state.musicService as PresetConfig['musicService'] : undefined,
  musicModel: state.musicEnabled ? state.musicModel : undefined,
  selectedMusicGenre: state.musicEnabled ? state.selectedMusicGenre : undefined,
  musicPreset: state.musicEnabled ? state.musicPreset : undefined,
  musicDurationSeconds: state.musicEnabled ? state.musicDurationSeconds : undefined,
  musicInstrumental: state.musicEnabled ? state.musicInstrumental : false,
  musicSampleRate: state.musicEnabled ? state.musicSampleRate : undefined,
  musicBitrate: state.musicEnabled ? state.musicBitrate : undefined,
  musicCustomInstructions: state.musicEnabled ? state.musicCustomInstructions : undefined,
  videoEnabled: state.videoEnabled,
  videoService: state.videoEnabled ? state.videoService : undefined,
  selectedVideoPrompts: state.videoEnabled ? [...state.selectedVideoPrompts] as PresetConfig['selectedVideoPrompts'] : [],
  videoModel: state.videoEnabled ? state.videoModel : undefined,
  videoSize: state.videoEnabled ? state.videoSize : undefined,
  videoDuration: state.videoEnabled ? state.videoDuration : undefined,
  videoAspectRatio: state.videoEnabled ? state.videoAspectRatio : undefined,
  videoCustomInstructions: state.videoEnabled ? state.videoCustomInstructions : undefined,
})

export const normalizePresetConfig = (config: PresetConfig): PresetConfig => ({
  ...config,
  llmCustomInstructions: normalizeOptionalText(config.llmCustomInstructions),
  imageCustomInstructions: normalizeOptionalText(config.imageCustomInstructions),
  musicCustomInstructions: normalizeOptionalText(config.musicCustomInstructions),
  videoCustomInstructions: normalizeOptionalText(config.videoCustomInstructions),
})

export const getPresetConfigError = (config: PresetConfig): string | null => {
  if (config.compatibilityKey === 'document') {
    if (!config.documentService || !config.documentModel) {
      return 'Document presets require a document service and model'
    }
  } else if (!config.transcriptionOption || !config.transcriptionModel) {
    return 'Audio/video presets require a transcription service and model'
  }

  if (config.llmEnabled) {
    if (!config.llmService || !config.llmModel) {
      return 'LLM presets require an LLM service and model'
    }
    if (config.selectedPrompts.length === 0) {
      return 'LLM presets require at least one prompt'
    }
  }

  if (config.ttsWithLlm) {
    if (!config.llmEnabled) {
      return 'TTS presets require LLM text output to be enabled'
    }
    if (!config.ttsService || !config.ttsVoice || !config.ttsModel) {
      return 'TTS presets require a TTS service, model, and voice'
    }
  }

  if (config.imageEnabled) {
    if (!config.imageService || !config.imageModel || !config.imageDimensionOrRatio) {
      return 'Image presets require an image service, model, and dimension'
    }
    if (config.selectedImagePrompts.length === 0) {
      return 'Image presets require at least one image prompt'
    }
  }

  if (config.musicEnabled) {
    if (!config.musicService || !config.musicModel || !config.selectedMusicGenre || !config.musicPreset || !config.musicDurationSeconds) {
      return 'Music presets require service, model, genre, preset, and duration'
    }
  }

  if (config.videoEnabled) {
    if (!config.videoService || !config.videoModel || !config.videoSize || !config.videoDuration || !config.videoAspectRatio) {
      return 'Video presets require service, model, size, duration, and aspect ratio'
    }
    if (config.selectedVideoPrompts.length === 0) {
      return 'Video presets require at least one video prompt'
    }
  }

  return null
}

export const applyPresetConfigToState = (state: StepsState, config: PresetConfig): StepsState => {
  const defaults = createInitialStepsState()

  return {
    ...defaults,
    selectedFile: state.selectedFile,
    uploadId: state.uploadId,
    uploadedFileName: state.uploadedFileName,
    uploadedFileDuration: state.uploadedFileDuration,
    isUploading: state.isUploading,
    uploadError: state.uploadError,
    uploadProgress: state.uploadProgress,
    urlValue: state.urlValue,
    isVerifying: state.isVerifying,
    urlMetadata: state.urlMetadata,
    urlVerified: state.urlVerified,
    documentRuntimeCapabilities: state.documentRuntimeCapabilities,
    transcriptionOption: config.transcriptionOption ?? defaults.transcriptionOption,
    transcriptionModel: config.transcriptionModel ?? defaults.transcriptionModel,
    transcriptionModelSelected: config.compatibilityKey !== 'document',
    documentService: config.documentService ?? defaults.documentService,
    documentModel: config.documentModel ?? defaults.documentModel,
    documentModelSelected: config.compatibilityKey === 'document',
    llmEnabled: config.llmEnabled,
    selectedPrompts: [...config.selectedPrompts],
    writeModeSelected: true,
    llmService: config.llmService ?? defaults.llmService,
    llmModel: config.llmModel ?? defaults.llmModel,
    llmModelSelected: config.llmEnabled,
    llmCustomInstructions: config.llmCustomInstructions ?? '',
    ttsWithLlm: config.ttsWithLlm,
    ttsService: config.ttsService ?? defaults.ttsService,
    ttsVoice: config.ttsVoice ?? defaults.ttsVoice,
    ttsModel: config.ttsModel ?? defaults.ttsModel,
    ttsModelSelected: config.ttsWithLlm,
    ttsVoiceSelected: config.ttsWithLlm,
    ttsDecisionMade: config.llmEnabled,
    imageEnabled: config.imageEnabled,
    mediaDecisionSelected: true,
    imageService: config.imageService ?? defaults.imageService,
    imageModel: config.imageModel ?? defaults.imageModel,
    imageModelSelected: config.imageEnabled,
    imageDimensionOrRatio: config.imageDimensionOrRatio ?? defaults.imageDimensionOrRatio,
    imageDimensionSelected: config.imageEnabled,
    selectedImagePrompts: config.imageEnabled ? [...config.selectedImagePrompts] : [...defaults.selectedImagePrompts],
    imagePromptSelected: config.imageEnabled && config.selectedImagePrompts.length > 0,
    imageCustomInstructions: config.imageCustomInstructions ?? '',
    musicEnabled: config.musicEnabled,
    musicService: config.musicService ?? defaults.musicService,
    musicModel: config.musicModel ?? defaults.musicModel,
    musicModelSelected: config.musicEnabled,
    selectedMusicGenre: config.selectedMusicGenre ?? defaults.selectedMusicGenre,
    musicGenreSelected: config.musicEnabled,
    musicPreset: config.musicPreset ?? defaults.musicPreset,
    musicPresetSelected: config.musicEnabled,
    musicDurationSeconds: config.musicDurationSeconds ?? defaults.musicDurationSeconds,
    musicDurationSelected: config.musicEnabled,
    musicInstrumental: config.musicEnabled ? config.musicInstrumental : defaults.musicInstrumental,
    musicSampleRate: config.musicSampleRate,
    musicBitrate: config.musicBitrate,
    musicCustomInstructions: config.musicCustomInstructions ?? '',
    videoEnabled: config.videoEnabled,
    videoService: config.videoService ?? defaults.videoService,
    selectedVideoPrompts: config.videoEnabled ? [...config.selectedVideoPrompts] : [...defaults.selectedVideoPrompts],
    videoPromptSelected: config.videoEnabled && config.selectedVideoPrompts.length > 0,
    videoModel: config.videoModel ?? defaults.videoModel,
    videoModelSelected: config.videoEnabled,
    videoSize: config.videoSize ?? defaults.videoSize,
    videoSizeSelected: config.videoEnabled,
    videoDuration: config.videoDuration ?? defaults.videoDuration,
    videoDurationSelected: config.videoEnabled,
    videoAspectRatio: config.videoAspectRatio ?? defaults.videoAspectRatio,
    videoAspectRatioSelected: config.videoEnabled,
    videoCustomInstructions: config.videoCustomInstructions ?? '',
  }
}

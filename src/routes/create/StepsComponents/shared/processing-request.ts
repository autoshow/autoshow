import type { SourceRoutesCreateStepsComponentsSharedProcessingRequestSerializedProcessingRequest as SerializedProcessingRequest,StepsState,SupportedDocumentType } from '~/types'

const setField = (
  fields: SerializedProcessingRequest,
  key: string,
  value: string | number | boolean | null | undefined
): void => {
  if (value == null) return
  if (typeof value === 'string' && value.length === 0) return
  fields[key] = String(value)
}

const joinSelected = (values: string[]): string | undefined => {
  const selected = values.filter(value => value.trim().length > 0)
  return selected.length > 0 ? selected.join(',') : undefined
}

export const serializeProcessingRequest = (
  state: StepsState,
  documentType: SupportedDocumentType | null | undefined
): SerializedProcessingRequest => {
  const fields: SerializedProcessingRequest = {
    llmEnabled: String(state.llmEnabled),
    ttsEnabled: String(state.llmEnabled && state.ttsWithLlm),
    imageGenEnabled: String(state.imageEnabled),
    musicGenEnabled: String(state.musicEnabled),
    videoGenEnabled: String(state.videoEnabled),
  }

  setField(fields, 'transcriptionOption', state.transcriptionOption || undefined)
  setField(fields, 'transcriptionModel', state.transcriptionModel || undefined)
  setField(fields, 'url', state.urlValue || undefined)
  setField(fields, 'uploadId', state.uploadId || undefined)
  setField(fields, 'urlType', state.urlMetadata?.urlType)
  setField(fields, 'urlDuration', state.urlMetadata?.duration ?? state.uploadedFileDuration)
  setField(fields, 'urlFileSize', state.urlMetadata?.fileSize)
  setField(fields, 'documentType', documentType)
  setField(fields, 'documentService', state.documentService || undefined)
  setField(fields, 'documentModel', state.documentModel || undefined)

  if (state.llmEnabled) {
    setField(fields, 'llmService', state.llmService)
    setField(fields, 'llmModel', state.llmModel)
    setField(fields, 'selectedPrompts', joinSelected(state.selectedPrompts))
    setField(fields, 'llmCustomInstructions', state.llmCustomInstructions || undefined)
  }

  if (state.llmEnabled && state.ttsWithLlm) {
    setField(fields, 'ttsService', state.ttsService)
    setField(fields, 'ttsVoice', state.ttsVoice)
    setField(fields, 'ttsModel', state.ttsModel)
  }

  if (state.imageEnabled) {
    setField(fields, 'selectedImagePrompts', joinSelected(state.selectedImagePrompts))
    setField(fields, 'imageService', state.imageService)
    setField(fields, 'imageModel', state.imageModel)
    setField(fields, 'imageDimensionOrRatio', state.imageDimensionOrRatio)
    setField(fields, 'imageCustomInstructions', state.imageCustomInstructions || undefined)
  }

  if (state.musicEnabled) {
    setField(fields, 'musicService', state.musicService)
    setField(fields, 'musicModel', state.musicModel)
    setField(fields, 'selectedMusicGenre', state.selectedMusicGenre)
    setField(fields, 'musicPreset', state.musicPreset)
    setField(fields, 'musicDurationSeconds', state.musicDurationSeconds)
    setField(fields, 'musicInstrumental', state.musicInstrumental)
    setField(fields, 'musicSampleRate', state.musicSampleRate)
    setField(fields, 'musicBitrate', state.musicBitrate)
    setField(fields, 'musicCustomInstructions', state.musicCustomInstructions || undefined)
  }

  if (state.videoEnabled) {
    setField(fields, 'videoService', state.videoService)
    setField(fields, 'selectedVideoPrompts', joinSelected(state.selectedVideoPrompts))
    setField(fields, 'videoModel', state.videoModel)
    setField(fields, 'videoSize', state.videoSize)
    setField(fields, 'videoDuration', state.videoDuration)
    setField(fields, 'videoAspectRatio', state.videoAspectRatio)
    setField(fields, 'videoCustomInstructions', state.videoCustomInstructions || undefined)
  }

  return fields
}

export const serializeAppendAssetsRequest = (
  state: StepsState
): SerializedProcessingRequest => {
  const fields: SerializedProcessingRequest = {
    llmEnabled: String(state.llmEnabled),
    ttsEnabled: String(state.ttsWithLlm),
    imageGenEnabled: String(state.imageEnabled),
    musicGenEnabled: String(state.musicEnabled),
    videoGenEnabled: String(state.videoEnabled),
  }

  if (state.llmEnabled) {
    setField(fields, 'llmService', state.llmService)
    setField(fields, 'llmModel', state.llmModel)
    setField(fields, 'selectedPrompts', joinSelected(state.selectedPrompts))
    setField(fields, 'llmCustomInstructions', state.llmCustomInstructions || undefined)
  }

  if (state.ttsWithLlm) {
    setField(fields, 'ttsService', state.ttsService)
    setField(fields, 'ttsVoice', state.ttsVoice)
    setField(fields, 'ttsModel', state.ttsModel)
  }

  if (state.imageEnabled) {
    setField(fields, 'selectedImagePrompts', joinSelected(state.selectedImagePrompts))
    setField(fields, 'imageService', state.imageService)
    setField(fields, 'imageModel', state.imageModel)
    setField(fields, 'imageDimensionOrRatio', state.imageDimensionOrRatio)
    setField(fields, 'imageCustomInstructions', state.imageCustomInstructions || undefined)
  }

  if (state.musicEnabled) {
    setField(fields, 'musicService', state.musicService)
    setField(fields, 'musicModel', state.musicModel)
    setField(fields, 'selectedMusicGenre', state.selectedMusicGenre)
    setField(fields, 'musicPreset', state.musicPreset)
    setField(fields, 'musicDurationSeconds', state.musicDurationSeconds)
    setField(fields, 'musicInstrumental', state.musicInstrumental)
    setField(fields, 'musicSampleRate', state.musicSampleRate)
    setField(fields, 'musicBitrate', state.musicBitrate)
    setField(fields, 'musicCustomInstructions', state.musicCustomInstructions || undefined)
  }

  if (state.videoEnabled) {
    setField(fields, 'videoService', state.videoService)
    setField(fields, 'selectedVideoPrompts', joinSelected(state.selectedVideoPrompts))
    setField(fields, 'videoModel', state.videoModel)
    setField(fields, 'videoSize', state.videoSize)
    setField(fields, 'videoDuration', state.videoDuration)
    setField(fields, 'videoAspectRatio', state.videoAspectRatio)
    setField(fields, 'videoCustomInstructions', state.videoCustomInstructions || undefined)
  }

  return fields
}

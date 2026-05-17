import type { TestDefinition, TranscriptionServiceType } from "~/types"
import {
  IMAGE_CONFIG,
  MUSIC_CONFIG,
  TTS_CONFIG,
  VIDEO_CONFIG,
  getDefaultImageModelForService,
  getDefaultMusicModelForService,
  getDefaultMusicService,
  getDefaultTranscriptionModelForService,
  getDefaultTTSModel,
  getDefaultVideoModel,
} from "~/models"
import { getDefaultLLMModelForService, getDefaultLLMService } from "~/models/models-config/llm-config"
import { getDefaultVideoService } from "~/routes/create/create-state"

const appendTranscriptionFields = (formData: FormData, def: TestDefinition): void => {
  const transcriptionService = def.transcription.service as TranscriptionServiceType
  const transcriptionModel = def.transcription.model || getDefaultTranscriptionModelForService(transcriptionService)
  formData.append("transcriptionOption", transcriptionService)
  formData.append("transcriptionModel", transcriptionModel)
}

const appendLlmFields = (formData: FormData, def: TestDefinition): void => {
  const llmService = def.llm.service || getDefaultLLMService()
  const llmModel = def.llm.model || getDefaultLLMModelForService(llmService)
  const llmEnabled = def.llm.prompts.length > 0
  formData.append("llmEnabled", llmEnabled ? "true" : "false")
  formData.append("llmService", llmService)
  formData.append("llmModel", llmModel)
  formData.append("selectedPrompts", def.llm.prompts.join(","))
}

const appendDocumentFields = (formData: FormData, def: TestDefinition): void => {
  if (def.document) {
    formData.append("documentService", def.document.service)
    formData.append("documentModel", def.document.model)
  }
}

const appendTtsFields = (formData: FormData, def: TestDefinition): void => {
  formData.append("ttsEnabled", def.tts.enabled ? "true" : "false")
  if (!def.tts.enabled) {
    return
  }

  const ttsService = def.tts.service || "openai"
  const ttsModel = def.tts.model || getDefaultTTSModel(ttsService)
  const ttsVoice = def.tts.voice || TTS_CONFIG[ttsService].voices[0]?.id || ""
  formData.append("ttsService", ttsService)
  formData.append("ttsVoice", ttsVoice)
  formData.append("ttsModel", ttsModel)
}

const appendImageFields = (formData: FormData, def: TestDefinition): void => {
  formData.append("imageGenEnabled", def.image.enabled ? "true" : "false")
  if (!def.image.enabled) {
    return
  }

  const imageService = def.image.service || "openai"
  const imageModel = def.image.model || getDefaultImageModelForService(imageService)
  const defaultRatio = IMAGE_CONFIG[imageService]?.aspectRatios?.[0] || IMAGE_CONFIG[imageService]?.dimensions?.[0]?.id || ""
  const imageDimensionOrRatio = def.image.aspectRatio || defaultRatio
  const prompts = def.image.prompts || []
  formData.append("selectedImagePrompts", prompts.join(","))
  formData.append("imageService", imageService)
  formData.append("imageModel", imageModel)
  formData.append("imageDimensionOrRatio", imageDimensionOrRatio)
}

const appendOptionalMusicQualityFields = (formData: FormData, def: TestDefinition): void => {
  if (def.music.sampleRate) {
    formData.append("musicSampleRate", String(def.music.sampleRate))
  }
  if (def.music.bitrate) {
    formData.append("musicBitrate", String(def.music.bitrate))
  }
}

const appendMusicFields = (formData: FormData, def: TestDefinition): void => {
  formData.append("musicGenSkipped", def.music.enabled ? "false" : "true")
  if (!def.music.enabled) {
    return
  }

  const musicService = def.music.service || getDefaultMusicService()
  const musicModel = def.music.model || getDefaultMusicModelForService(musicService)
  const genre = def.music.genre || MUSIC_CONFIG[musicService]?.genres[0]?.id || ""
  const musicPreset = def.music.preset || "cheap"
  const musicDurationSeconds = def.music.durationSeconds || 60
  const musicInstrumental = def.music.instrumental ?? false
  formData.append("musicService", musicService)
  formData.append("musicModel", musicModel)
  formData.append("selectedMusicGenre", genre)
  formData.append("musicPreset", musicPreset)
  formData.append("musicDurationSeconds", String(musicDurationSeconds))
  formData.append("musicInstrumental", musicInstrumental ? "true" : "false")
  appendOptionalMusicQualityFields(formData, def)
}

const appendVideoFields = (formData: FormData, def: TestDefinition): void => {
  formData.append("videoGenEnabled", def.video.enabled ? "true" : "false")
  if (!def.video.enabled) {
    return
  }

  const videoService = def.video.service || getDefaultVideoService()
  const videoModel = def.video.model || getDefaultVideoModel(videoService)
  const prompts = def.video.prompts || []
  const size = def.video.size || VIDEO_CONFIG[videoService]?.sizes[0]?.id || ""
  const duration = def.video.duration || VIDEO_CONFIG[videoService]?.durations[0] || 0
  const aspectRatio = def.video.aspectRatio || VIDEO_CONFIG[videoService]?.aspectRatios?.[0] || ""
  formData.append("videoService", videoService)
  formData.append("videoModel", videoModel)
  formData.append("selectedVideoPrompts", prompts.join(","))
  formData.append("videoSize", size)
  formData.append("videoDuration", String(duration))
  formData.append("videoAspectRatio", aspectRatio)
}

export function buildFormDataFromDefinition(def: TestDefinition): FormData {
  const formData = new FormData()
  appendTranscriptionFields(formData, def)
  appendLlmFields(formData, def)
  appendDocumentFields(formData, def)
  appendTtsFields(formData, def)
  appendImageFields(formData, def)
  appendMusicFields(formData, def)
  appendVideoFields(formData, def)
  return formData
}

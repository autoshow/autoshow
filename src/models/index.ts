export {
  TRANSCRIPTION_CONFIG,
  isWhisperService,
  isDiarizationService,
  isStreamingService,
  getDefaultWhisperModel,
  getDefaultStreamingModel,
  getTranscriptionModelsForService,
  getDefaultTranscriptionModelForService,
  isValidTranscriptionModel,
} from '~/models/transcription-config'

export {
  LLM_CONFIG,
  getLLMProviders,
  getLLMModelsForService,
  getDefaultLLMService,
  getDefaultLLMModelForService,
  getDefaultLLMModel,
  getLLMModelIdsForService,
  isValidLLMModel,
} from '~/models/llm-config'

export { TTS_CONFIG, getDefaultTTSModel, getTTSModelsForService, getTTSModelIdsForService, isValidTTSModel } from '~/models/tts-config'

export { IMAGE_CONFIG, getImageModelsForService, getDefaultImageModelForService, isValidImageModel } from '~/models/image-config'

export {
  MUSIC_CONFIG,
  getMusicModelsForService,
  getDefaultMusicModelForService,
  isValidMusicModel,
  getMusicGenres,
  getDefaultMusicGenre,
  getDefaultMusicService,
} from '~/models/music-config'

export {
  VIDEO_CONFIG,
  getDefaultVideoModel,
  getDefaultVideoSize,
  getDefaultVideoDuration,
  getVideoPromptTypes,
  getVideoModelsForService,
  isValidVideoModel,
} from '~/models/video-config'

export {
  DOCUMENT_CONFIG,
  getDocumentExtractionModels,
  getDefaultDocumentModel,
  getDefaultDocumentService,
  getDocumentServiceName,
  isDocumentExtension,
  getDocumentTypeFromExtension,
} from '~/models/document-config'

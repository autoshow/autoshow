import { DOCUMENT_CONFIG } from '~/models/models-config/document-config'
import { IMAGE_CONFIG } from '~/models/models-config/image-config'
import { LLM_CONFIG } from '~/models/models-config/llm-config'
import { MUSIC_CONFIG } from '~/models/models-config/music-config'
import { getTranscriptionModelConfig } from '~/models/models-config/transcription-config'
import { TTS_CONFIG } from '~/models/models-config/tts-config'
import { VIDEO_CONFIG } from '~/models/models-config/video-config'
import type {
SourceModelsModelsUtilsModelLookupDocumentModelEntry as DocumentModelEntry,
SourceModelsModelsUtilsModelLookupImageModelEntry as ImageModelEntry,
SourceModelsModelsUtilsModelLookupLLMModelEntry as LLMModelEntry,
SourceModelsModelsUtilsModelLookupMusicModelEntry as MusicModelEntry,
SourceModelsModelsUtilsModelLookupServiceConfig as ServiceConfig,
SourceModelsModelsUtilsModelLookupTTSModelEntry as TTSModelEntry,
SourceModelsModelsUtilsModelLookupVideoModelEntry as VideoModelEntry
} from '~/types'

function findModelInConfig<M extends { id: string }>(config: ServiceConfig<M>, service: string, modelId: string): M | undefined {
  return config[service]?.models.find(candidate => candidate.id === modelId)
}

export function findTranscriptionModel(service: string, modelId: string) {
  return getTranscriptionModelConfig(service, modelId)
}

export function findLLMModel(service: string, modelId: string) {
  return findModelInConfig(LLM_CONFIG as ServiceConfig<LLMModelEntry>, service, modelId)
}

export function findDocumentModel(service: string, modelId: string) {
  return findModelInConfig(DOCUMENT_CONFIG as ServiceConfig<DocumentModelEntry>, service, modelId)
}

export function findTTSModel(service: string, modelId: string) {
  return findModelInConfig(TTS_CONFIG as ServiceConfig<TTSModelEntry>, service, modelId)
}

export function findImageModel(service: string, modelId: string) {
  return findModelInConfig(IMAGE_CONFIG as ServiceConfig<ImageModelEntry>, service, modelId)
}

export function findMusicModel(service: string, modelId: string) {
  return findModelInConfig(MUSIC_CONFIG as ServiceConfig<MusicModelEntry>, service, modelId)
}

export function findVideoModel(service: string, modelId: string) {
  return findModelInConfig(VIDEO_CONFIG as ServiceConfig<VideoModelEntry>, service, modelId)
}

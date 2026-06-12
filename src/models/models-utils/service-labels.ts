import { IMAGE_CONFIG } from '~/models/models-config/image-config'
import { LLM_CONFIG } from '~/models/models-config/llm-config'
import { MUSIC_CONFIG } from '~/models/models-config/music-config'
import { TRANSCRIPTION_CONFIG } from '~/models/models-config/transcription-config'
import { TTS_CONFIG } from '~/models/models-config/tts-config'
import { VIDEO_CONFIG } from '~/models/models-config/video-config'
import {
type ImageGenServiceType,
type LLMServiceType,
type MusicServiceType,
type TTSServiceType,
type VideoGenServiceType,
} from '~/types'

const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
}

const getFileExtension = (fileName: string | null | undefined): string | null => {
  if (!fileName) return null
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot === -1) return null
  return fileName.slice(lastDot).toLowerCase()
}

const GENERIC_TTS_SERVICE_LABELS = new Set<TTSServiceType>([
  'openai',
  'elevenlabs',
  'gemini',
  'grok',
  'runway',
  'deapi',
])

export const getTtsAudioMimeType = (fileName: string | null | undefined): string => {
  const extension = getFileExtension(fileName)
  if (!extension) return 'audio/wav'
  return AUDIO_MIME_BY_EXTENSION[extension] || 'audio/wav'
}

export const getTranscriptionServiceName = (service: string | null | undefined): string => {
  if (!service) return 'N/A'

  const transcriptionConfig = Object.values(TRANSCRIPTION_CONFIG)
    .flatMap(group => Object.entries(group))
    .find(([key]) => key === service)?.[1]

  return transcriptionConfig?.name || service
}

export const getLLMServiceName = (service: string | null | undefined): string => {
  if (!service) return 'N/A'
  return LLM_CONFIG[service as LLMServiceType]?.name || service
}

export const getTTSServiceName = (service: string | null | undefined): string => {
  if (!service) return 'N/A'
  const label = TTS_CONFIG[service as TTSServiceType]?.name || service

  if (GENERIC_TTS_SERVICE_LABELS.has(service as TTSServiceType)) {
    return label.replace(/\s+(?:Text-to-Speech|TTS)$/, '')
  }

  return label
}

export const getImageServiceName = (service: string | null | undefined): string => {
  if (!service) return 'N/A'
  return IMAGE_CONFIG[service as ImageGenServiceType]?.name || service
}

export const getMusicServiceName = (service: string | null | undefined): string => {
  if (!service) return 'N/A'
  return MUSIC_CONFIG[service as MusicServiceType]?.name || service
}

export const getVideoServiceName = (service: string | null | undefined): string => {
  if (!service) return 'N/A'
  return VIDEO_CONFIG[service as VideoGenServiceType]?.name || service
}

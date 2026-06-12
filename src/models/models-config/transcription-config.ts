import { attachModelEstimations,buildTranscriptionModelEstimation } from '~/models/models-utils/estimate-speed'
import { createTranscriptionSpeedProfile } from '~/models/models-utils/speed'
import type { TranscriptionConfig,TranscriptionServiceType } from '~/types'

export const TRANSCRIPTION_CONFIG: TranscriptionConfig = {
  whisper: {
    groq: {
      name: "Groq Whisper",
      models: attachModelEstimations([
        {
          id: "whisper-large-v3-turbo",
          name: "whisper-large-v3-turbo",
          description: "Fast cloud transcription with automatic segmentation",
          speedProfile: createTranscriptionSpeedProfile(0.35, { baseMs: 200 }),
          quality: "B",
          centicentsPerMin: 6.66
        },
        {
          id: "whisper-large-v3",
          name: "whisper-large-v3",
          description: "Maximum accuracy cloud transcription with automatic segmentation",
          speedProfile: createTranscriptionSpeedProfile(0.37),
          quality: "A",
          centicentsPerMin: 18.50
        }
      ], buildTranscriptionModelEstimation)
    },
    deepinfra: {
      name: "DeepInfra Whisper",
      models: attachModelEstimations([
        {
          id: "openai/whisper-large-v3-turbo",
          name: "whisper-large-v3-turbo",
          description: "Fast cloud transcription with automatic segmentation",
          speedProfile: createTranscriptionSpeedProfile(0.84),
          quality: "B",
          centicentsPerMin: 2
        },
        {
          id: "openai/whisper-large-v3",
          name: "whisper-large-v3",
          description: "Maximum accuracy cloud transcription with automatic segmentation",
          speedProfile: createTranscriptionSpeedProfile(1.0, { baseMs: 1_000 }),
          quality: "A",
          centicentsPerMin: 4.50
        }
      ], buildTranscriptionModelEstimation)
    }
  },
  diarization: {
    gladia: {
      name: "Gladia",
      models: attachModelEstimations([
        {
          id: "gladia-v2",
          name: "Gladia V2",
          description: "Pre-recorded transcription with speaker diarization and language detection",
          speedProfile: createTranscriptionSpeedProfile(0.5, { baseMs: 7_000 }),
          quality: "A",
          centicentsPerMin: 100
        }
      ], buildTranscriptionModelEstimation)
    },
    assembly: {
      name: "AssemblyAI",
      models: attachModelEstimations([
        {
          id: "universal-3-pro",
          name: "Universal-3-Pro",
          description: "AssemblyAI Universal-3-Pro speech model with speaker labels",
          speedProfile: createTranscriptionSpeedProfile(0.7, { baseMs: 26_700 }),
          quality: "A",
          centicentsPerMin: 35
        }
      ], buildTranscriptionModelEstimation)
    },
    deepgram: {
      name: "Deepgram Nova 3",
      models: attachModelEstimations([
        {
          id: "nova-3",
          name: "Nova 3",
          description: "Deepgram Nova 3 transcription with speaker diarization",
          speedProfile: createTranscriptionSpeedProfile(0.5, { baseMs: 100 }),
          quality: "A",
          centicentsPerMin: 43
        }
      ], buildTranscriptionModelEstimation)
    },
    soniox: {
      name: "Soniox",
      models: attachModelEstimations([
        {
          id: "stt-async-v4",
          name: "Soniox Async V4",
          description: "Soniox async transcription with speaker diarization",
          speedProfile: createTranscriptionSpeedProfile(1.0, { baseMs: 5_100 }),
          quality: "A",
          centicentsPerMin: 16.67
        }
      ], buildTranscriptionModelEstimation)
    }
  },
  streaming: {
    youtube: {
      name: "YouTube Captions",
      models: attachModelEstimations([
        {
          id: "captions",
          name: "YouTube Captions",
          description: "Use the selected YouTube caption track when captions are available",
          speedProfile: createTranscriptionSpeedProfile(0, { baseMs: 100 }),
          quality: "Variable",
          centicentsPerMin: 0
        }
      ], buildTranscriptionModelEstimation)
    },
    happyscribe: {
      name: "HappyScribe",
      models: attachModelEstimations([
        {
          id: "happyscribe-auto",
          name: "happyscribe-default",
          description: "All-in-one professional service with automatic download and transcription with speaker diarization",
          speedProfile: createTranscriptionSpeedProfile(1.5, { baseMs: 73_200 }),
          quality: "B",
          centicentsPerMin: 100
        }
      ], buildTranscriptionModelEstimation)
    },
    gladia: {
      name: "Gladia",
      models: attachModelEstimations([
        {
          id: "gladia-v2",
          name: "Gladia V2",
          description: "Fast streaming transcription with speaker diarization and language detection",
          speedProfile: createTranscriptionSpeedProfile(0.5, { baseMs: 7_000 }),
          quality: "A",
          centicentsPerMin: 100
        }
      ], buildTranscriptionModelEstimation)
    },
    deapi: {
      name: "deAPI",
      models: attachModelEstimations([
        {
          id: "whisper-large-v3",
          name: "WhisperLargeV3",
          description: "Video-to-text transcription via deAPI decentralized GPU network",
          speedProfile: createTranscriptionSpeedProfile(1.0),
          quality: "A",
          centicentsPerMin: 2.1
        }
      ], buildTranscriptionModelEstimation)
    },
    supadata: {
      name: "Supadata",
      models: attachModelEstimations([
        {
          id: "supadata-default",
          name: "Supadata Default",
          description: "Streaming transcription for YouTube, TikTok, Instagram, X, Facebook URLs",
          speedProfile: createTranscriptionSpeedProfile(1.0, { baseMs: 1_100 }),
          quality: "A",
          centicentsPerMin: 100
        }
      ], buildTranscriptionModelEstimation)
    }
  }
}

const getServiceConfig = (service: string) => {
  if (service in TRANSCRIPTION_CONFIG.whisper) {
    return TRANSCRIPTION_CONFIG.whisper[service as keyof typeof TRANSCRIPTION_CONFIG.whisper]
  }
  if (service in TRANSCRIPTION_CONFIG.diarization) {
    return TRANSCRIPTION_CONFIG.diarization[service as keyof typeof TRANSCRIPTION_CONFIG.diarization]
  }
  if (service in TRANSCRIPTION_CONFIG.streaming) {
    return TRANSCRIPTION_CONFIG.streaming[service as keyof typeof TRANSCRIPTION_CONFIG.streaming]
  }
  return undefined
}

export const getTranscriptionModelConfig = (service: string, modelId: string) => {
  return getServiceConfig(service)?.models.find(model => model.id === modelId)
}

export const getTranscriptionModelsForService = (service: TranscriptionServiceType): string[] => {
  const config = getServiceConfig(service)
  return config ? config.models.map(model => model.id) : []
}

export const getDefaultTranscriptionModelForService = (service: TranscriptionServiceType): string => {
  return getTranscriptionModelsForService(service)[0] || ''
}

export const isValidTranscriptionModel = (service: TranscriptionServiceType, model: string): boolean => {
  return getTranscriptionModelConfig(service, model) !== undefined
}

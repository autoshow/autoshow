import type { TranscriptionServiceType, TranscriptionConfig } from '~/types'

export const TRANSCRIPTION_CONFIG: TranscriptionConfig = {
  whisper: {
    groq: {
      name: "Groq Whisper",
      models: [
        {
          id: "whisper-large-v3-turbo",
          name: "whisper-large-v3-turbo",
          description: "Fast cloud transcription with automatic segmentation",
          speed: "A",
          quality: "B",
          secsPerMin: 0.35,
          centicentsPerMin: 6.66
        },
        {
          id: "whisper-large-v3",
          name: "whisper-large-v3",
          description: "Maximum accuracy cloud transcription with automatic segmentation",
          speed: "B",
          quality: "A",
          secsPerMin: 0.37,
          centicentsPerMin: 18.50
        }
      ]
    },
    deepinfra: {
      name: "DeepInfra Whisper",
      models: [
        {
          id: "openai/whisper-large-v3-turbo",
          name: "whisper-large-v3-turbo",
          description: "Fast cloud transcription with automatic segmentation",
          speed: "A",
          quality: "B",
          secsPerMin: 0.84,
          centicentsPerMin: 2
        },
        {
          id: "openai/whisper-large-v3",
          name: "whisper-large-v3",
          description: "Maximum accuracy cloud transcription with automatic segmentation",
          speed: "B",
          quality: "A",
          secsPerMin: 1.0,
          centicentsPerMin: 4.50
        }
      ]
    }
  },
  diarization: {
    fal: {
      name: "Fal Whisper",
      models: [
        {
          id: "fal-ai/whisper",
          name: "whisper-large-v3",
          description: "High-quality cloud transcription with speaker diarization",
          speed: "B",
          quality: "A",
          secsPerMin: 1.0,
          centicentsPerMin: 165
        }
      ]
    },
    gladia: {
      name: "Gladia",
      models: [
        {
          id: "gladia-v2",
          name: "Gladia V2",
          description: "Pre-recorded transcription with speaker diarization and language detection",
          speed: "A",
          quality: "A",
          secsPerMin: 0.5,
          centicentsPerMin: 100
        }
      ]
    },
    elevenlabs: {
      name: "ElevenLabs Scribe",
      models: [
        {
          id: "scribe_v2",
          name: "Scribe V2",
          description: "State-of-the-art transcription with speaker diarization and 90+ language support",
          speed: "A",
          quality: "A",
          secsPerMin: 0.5,
          centicentsPerMin: 80
        }
      ]
    },
    rev: {
      name: "Rev AI",
      models: [
        {
          id: "rev-machine",
          name: "Rev Machine",
          description: "Rev.ai machine transcription with speaker labels",
          speed: "B",
          quality: "A",
          secsPerMin: 1.0,
          centicentsPerMin: 200
        }
      ]
    },
    assembly: {
      name: "AssemblyAI",
      models: [
        {
          id: "universal",
          name: "Universal",
          description: "AssemblyAI Universal speech model with speaker labels",
          speed: "A",
          quality: "A",
          secsPerMin: 0.5,
          centicentsPerMin: 28.33
        },
        {
          id: "slam-1",
          name: "Slam-1",
          description: "AssemblyAI Slam-1 speech model with speaker labels",
          speed: "B",
          quality: "A",
          secsPerMin: 0.7,
          centicentsPerMin: 48.33
        }
      ]
    },
    deepgram: {
      name: "Deepgram Nova 3",
      models: [
        {
          id: "nova-3",
          name: "Nova 3",
          description: "Deepgram Nova 3 transcription with speaker diarization",
          speed: "A",
          quality: "A",
          secsPerMin: 0.5,
          centicentsPerMin: 43
        }
      ]
    },
    soniox: {
      name: "Soniox",
      models: [
        {
          id: "stt-async-v4",
          name: "Soniox Async V4",
          description: "Soniox async transcription with speaker diarization",
          speed: "B",
          quality: "A",
          secsPerMin: 1.0,
          centicentsPerMin: 16.67
        }
      ]
    }
  },
  streaming: {
    happyscribe: {
      name: "HappyScribe",
      models: [
        {
          id: "happyscribe-auto",
          name: "happyscribe-default",
          description: "All-in-one professional service with automatic download and transcription with speaker diarization",
          speed: "B",
          quality: "B",
          secsPerMin: 1.5,
          centicentsPerMin: 100
        }
      ]
    },
    gladia: {
      name: "Gladia",
      models: [
        {
          id: "gladia-v2",
          name: "Gladia V2",
          description: "Fast streaming transcription with speaker diarization and language detection",
          speed: "A",
          quality: "A",
          secsPerMin: 0.5,
          centicentsPerMin: 100
        }
      ]
    }
  }
}

export const isWhisperService = (service: TranscriptionServiceType): boolean => {
  return service === 'groq' || service === 'deepinfra'
}

export const isDiarizationService = (service: TranscriptionServiceType): boolean => {
  return service === 'fal' || service === 'gladia' || service === 'elevenlabs' || service === 'rev' || service === 'assembly' || service === 'deepgram' || service === 'soniox'
}

export const isStreamingService = (service: TranscriptionServiceType): boolean => {
  return service === 'happyscribe' || service === 'gladia'
}

export const getDefaultWhisperModel = (): string => {
  return TRANSCRIPTION_CONFIG.whisper.groq.models[0]!.id
}

export const getDefaultStreamingModel = (): string => {
  return TRANSCRIPTION_CONFIG.streaming.happyscribe.models[0]!.id
}

export const getDefaultDiarizationModel = (): string => {
  return TRANSCRIPTION_CONFIG.diarization.gladia.models[0]!.id
}

const getServiceConfig = (service: TranscriptionServiceType) => {
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

export const getTranscriptionModelsForService = (service: TranscriptionServiceType): string[] => {
  const config = getServiceConfig(service)
  return config ? config.models.map(model => model.id) : []
}

export const getDefaultTranscriptionModelForService = (service: TranscriptionServiceType): string => {
  return getTranscriptionModelsForService(service)[0] || ''
}

export const isValidTranscriptionModel = (service: TranscriptionServiceType, model: string): boolean => {
  return getTranscriptionModelsForService(service).includes(model)
}

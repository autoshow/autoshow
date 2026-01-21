import type { TranscriptionServiceType, ServicesConfig, MusicGenre } from '~/types/main'

export const SERVICES_CONFIG: ServicesConfig = {
  transcription: {
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
            secsPerMin: 0.35
          },
          {
            id: "whisper-large-v3",
            name: "whisper-large-v3",
            description: "Maximum accuracy cloud transcription with automatic segmentation",
            speed: "B",
            quality: "A",
            secsPerMin: 0.37
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
            secsPerMin: 0.84
          },
          {
            id: "openai/whisper-large-v3",
            name: "whisper-large-v3",
            description: "Maximum accuracy cloud transcription with automatic segmentation",
            speed: "B",
            quality: "A",
            secsPerMin: 1.0
          }
        ]
      }
    },
    diarization: {
      lemonfox: {
        name: "Lemonfox",
        models: [
          {
            id: "whisper-large-v3",
            name: "whisper-large-v3",
            description: "High accuracy transcription with speaker diarization",
            speed: "B",
            quality: "A",
            secsPerMin: 1.34
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
            secsPerMin: 1.5
          }
        ]
      }
    }
  },
  llm: {
    openai: {
      name: "OpenAI",
      models: [
        {
          id: "gpt-5",
          name: "gpt-5",
          description: "Most advanced OpenAI model with exceptional reasoning capabilities",
          speed: "B",
          quality: "A",
          secsPerMin: 0.45
        },
        {
          id: "gpt-5-mini",
          name: "gpt-5-mini",
          description: "Balanced OpenAI model offering great performance at lower cost",
          speed: "A",
          quality: "B",
          secsPerMin: 0.32
        },
        {
          id: "gpt-5-nano",
          name: "gpt-5-nano",
          description: "Efficient OpenAI model optimized for speed and cost-effectiveness",
          speed: "A",
          quality: "C",
          secsPerMin: 0.62
        },
        {
          id: "gpt-5.1",
          name: "gpt-5.1",
          description: "Updated GPT-5 with enhanced reasoning capabilities",
          speed: "B",
          quality: "A",
          secsPerMin: 0.085
        },
        {
          id: "gpt-5.2",
          name: "gpt-5.2",
          description: "Latest GPT-5 series with expanded knowledge and improved performance",
          speed: "B",
          quality: "A",
          secsPerMin: 0.065
        },
        {
          id: "gpt-5.2-pro",
          name: "gpt-5.2-pro",
          description: "Professional-tier GPT-5.2 for demanding applications",
          speed: "C",
          quality: "A",
          secsPerMin: 1.65
        }
      ]
    },
    anthropic: {
      name: "Anthropic",
      models: [
        {
          id: "claude-sonnet-4-5-20250929",
          name: "Claude Sonnet 4.5",
          description: "Smart model for complex agents and coding",
          speed: "A",
          quality: "A"
        },
        {
          id: "claude-opus-4-5-20251101",
          name: "Claude Opus 4.5",
          description: "Premium model with maximum intelligence",
          speed: "B",
          quality: "A"
        },
        {
          id: "claude-haiku-4-5-20251001",
          name: "Claude Haiku 4.5",
          description: "Fastest model with near-frontier intelligence",
          speed: "A",
          quality: "B"
        }
      ]
    },
    gemini: {
      name: "Google Gemini",
      models: [
        {
          id: "gemini-3-pro-preview",
          name: "Gemini 3 Pro",
          description: "Most intelligent model for complex reasoning tasks",
          speed: "B",
          quality: "A"
        },
        {
          id: "gemini-3-flash-preview",
          name: "Gemini 3 Flash",
          description: "Pro-level intelligence at Flash speed and pricing",
          speed: "A",
          quality: "A"
        }
      ]
    }
  },
  tts: {
    openai: {
      name: "OpenAI Text-to-Speech",
      model: "gpt-4o-mini-tts",
      voices: [
        { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
        { id: "ash", name: "Ash", description: "Clear and articulate" },
        { id: "ballad", name: "Ballad", description: "Smooth and melodic" },
        { id: "coral", name: "Coral", description: "Warm and friendly" },
        { id: "echo", name: "Echo", description: "Calm and measured" },
        { id: "fable", name: "Fable", description: "Expressive and storytelling" },
        { id: "nova", name: "Nova", description: "Energetic and bright" },
        { id: "onyx", name: "Onyx", description: "Deep and authoritative" },
        { id: "sage", name: "Sage", description: "Wise and thoughtful" },
        { id: "shimmer", name: "Shimmer", description: "Gentle and soothing" }
      ]
    },
    elevenlabs: {
      name: "Elevenlabs Text-to-Speech",
      model: "eleven_flash_v2_5",
      voices: [
        { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Natural and conversational" },
        { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", description: "Deep and authoritative" },
        { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Warm and expressive" },
        { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", description: "Clear and professional" },
        { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Friendly and engaging" },
        { id: "IKne3meq5aSn9XLyUdCD", name: "Charlotte", description: "Elegant and refined" },
        { id: "XB0fDUnXU5powFXDhCwa", name: "Clyde", description: "Confident and strong" },
        { id: "iP95p4xoKVk53GoZ742B", name: "Dave", description: "Relaxed and casual" },
        { id: "nPczCjzI2devNBz1zQrb", name: "Emily", description: "Gentle and soothing" },
        { id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy", description: "Warm and mature" }
      ]
    }
  },
  imageGen: {
    openai: {
      name: "ChatGPT Image",
      model: "gpt-image-1",
      description: "Advanced AI image generation with high-quality output and prompt understanding"
    }
  },
  music: {
    elevenlabs: {
      name: "Eleven Music",
      model: "music_v1",
      description: "Studio-grade music generation with natural language prompts",
      genres: [
        { id: "rap", name: "Rap", description: "Hip-hop beats with rhythmic flow and urban production" },
        { id: "rock", name: "Rock", description: "Electric guitars with driving drums and powerful energy" },
        { id: "pop", name: "Pop", description: "Catchy melodies with modern production and radio-friendly sound" },
        { id: "country", name: "Country", description: "Acoustic guitars with storytelling vocals and Americana feel" },
        { id: "folk", name: "Folk", description: "Acoustic instruments with organic sound and traditional influences" },
        { id: "jazz", name: "Jazz", description: "Swing rhythms with improvisation and sophisticated harmonies" }
      ]
    }
  },
  videoGen: {
    openai: {
      name: "OpenAI Sora",
      models: [
        {
          id: "sora-2",
          name: "Sora 2",
          description: "Fast video generation for rapid iteration and social content",
          speed: "A",
          quality: "B"
        },
        {
          id: "sora-2-pro",
          name: "Sora 2 Pro",
          description: "Production-quality cinematic video for marketing assets",
          speed: "B",
          quality: "A"
        }
      ],
      sizes: [
        { id: "1920x1080", name: "1080p Landscape", description: "Full HD widescreen (16:9)" },
        { id: "1080x1920", name: "1080p Portrait", description: "Full HD vertical for TikTok/Reels/Shorts" },
        { id: "1280x720", name: "720p Landscape", description: "HD widescreen (16:9)" },
        { id: "720x1280", name: "720p Portrait", description: "HD vertical" }
      ],
      durations: [4, 8, 12]
    }
  }
}

export const isWhisperService = (service: TranscriptionServiceType): boolean => {
  return service === 'groq' || service === 'deepinfra'
}

export const isDiarizationService = (service: TranscriptionServiceType): boolean => {
  return service === 'lemonfox'
}

export const isStreamingService = (service: TranscriptionServiceType): boolean => {
  return service === 'happyscribe'
}

export const getDefaultWhisperModel = (): string => {
  return SERVICES_CONFIG.transcription.whisper.groq.models[0]!.id
}

export const getDefaultStreamingModel = (): string => {
  return SERVICES_CONFIG.transcription.streaming.happyscribe.models[0]!.id
}

export const getDefaultLLMModel = (): string => {
  return SERVICES_CONFIG.llm.openai.models[0]!.id
}

export const getLLMProviders = (): string[] => {
  return Object.keys(SERVICES_CONFIG.llm)
}

export const getLLMModelsForService = (service: string) => {
  const provider = SERVICES_CONFIG.llm[service as keyof typeof SERVICES_CONFIG.llm]
  return provider?.models ?? []
}

export const getDefaultLLMService = (): string => 'openai'

export const getDefaultLLMModelForService = (service: string): string => {
  const models = getLLMModelsForService(service)
  return models[0]?.id ?? 'gpt-5'
}

export const getMusicGenres = (): MusicGenre[] => {
  return SERVICES_CONFIG.music.elevenlabs.genres.map(g => g.id as MusicGenre)
}

export const getDefaultMusicGenre = (): MusicGenre => {
  return 'pop'
}

export const getDefaultVideoModel = (): string => {
  return SERVICES_CONFIG.videoGen.openai.models[0]!.id
}

export const getDefaultVideoSize = (): string => {
  return '1280x720'
}

export const getDefaultVideoDuration = (): number => {
  return 8
}

export const getVideoPromptTypes = (): string[] => {
  return ['explainer', 'highlight', 'intro', 'outro', 'social']
}

import type { TTSConfig, TTSServiceType } from '~/types'

export const TTS_CONFIG: TTSConfig = {
  openai: {
    name: "OpenAI Text-to-Speech",
    models: [
      {
        id: "gpt-4o-mini-tts",
        name: "GPT-4o Mini TTS",
        description: "Fast and efficient text-to-speech with natural intonation",
        speed: "A",
        quality: "A"
      }
    ],
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
    name: "ElevenLabs Text-to-Speech",
    models: [
      {
        id: "eleven_flash_v2_5",
        name: "Flash v2.5",
        description: "Ultra-fast multilingual speech synthesis",
        speed: "A",
        quality: "B"
      },
      {
        id: "eleven_turbo_v2_5",
        name: "Turbo v2.5",
        description: "High quality, low-latency with good balance of quality and speed",
        speed: "B",
        quality: "A"
      }
    ],
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
  },
  groq: {
    name: "Groq Orpheus TTS",
    models: [
      {
        id: "canopylabs/orpheus-v1-english",
        name: "Orpheus v1",
        description: "High-speed English speech synthesis optimized for Groq",
        speed: "A",
        quality: "B"
      }
    ],
    voices: [
      { id: "autumn", name: "Autumn", description: "Female, expressive range" },
      { id: "diana", name: "Diana", description: "Female, clear and professional" },
      { id: "hannah", name: "Hannah", description: "Female, warm and friendly" },
      { id: "austin", name: "Austin", description: "Male, confident and articulate" },
      { id: "daniel", name: "Daniel", description: "Male, calm and measured" },
      { id: "troy", name: "Troy", description: "Male, natural and conversational" }
    ]
  }
}

export const getDefaultTTSModel = (service: TTSServiceType): string => {
  return TTS_CONFIG[service].models[0]!.id
}

export const getTTSModelsForService = (service: TTSServiceType) => {
  return TTS_CONFIG[service].models
}

export const getTTSModelIdsForService = (service: TTSServiceType): string[] => {
  return getTTSModelsForService(service).map(model => model.id)
}

export const isValidTTSModel = (service: TTSServiceType, model: string): boolean => {
  return getTTSModelIdsForService(service).includes(model)
}

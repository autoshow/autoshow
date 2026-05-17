import { attachModelEstimations,buildTTSModelEstimation } from '~/models/models-utils/estimate-speed'
import { createTTSSpeedProfile } from '~/models/models-utils/speed'
import type { TTSConfig,TTSServiceType } from '~/types'

export const TTS_CONFIG: TTSConfig = {
  openai: {
    name: "OpenAI TTS",
    models: attachModelEstimations([
      {
        id: "gpt-4o-mini-tts",
        name: "GPT-4o Mini TTS",
        description: "Fast and efficient TTS with natural intonation",
        speedProfile: createTTSSpeedProfile("A"),
        quality: "A",
        costPerMillionChars: 15
      }
    ], buildTTSModelEstimation),
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
    name: "ElevenLabs TTS",
    models: attachModelEstimations([
      {
        id: "eleven_flash_v2_5",
        name: "Flash v2.5",
        description: "Ultra-fast multilingual speech synthesis",
        speedProfile: createTTSSpeedProfile("A", { baseMs: 1_000 }),
        quality: "B",
        costPerMillionChars: 66
      },
      {
        id: "eleven_turbo_v2_5",
        name: "Turbo v2.5",
        description: "High quality, low-latency with good balance of quality and speed",
        speedProfile: createTTSSpeedProfile("B", { baseMs: 5_000 }),
        quality: "A",
        costPerMillionChars: 66
      }
    ], buildTTSModelEstimation),
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
  deepgram: {
    name: "Deepgram Aura TTS",
    models: attachModelEstimations([
      {
        id: "aura-2-thalia-en",
        name: "Aura 2 Thalia EN",
        description: "Fast English speech synthesis with Deepgram Aura",
        speedProfile: createTTSSpeedProfile("A"),
        quality: "A",
        costPerMillionChars: 15
      }
    ], buildTTSModelEstimation),
    voices: [
      { id: "aura-2-thalia-en", name: "Thalia", description: "Clear and modern English narration" }
    ]
  },
  gemini: {
    name: "Gemini TTS",
    models: attachModelEstimations([
      {
        id: "gemini-2.5-flash-preview-tts",
        name: "Gemini 2.5 Flash Preview TTS",
        description: "Native Gemini speech synthesis with expressive preview voices",
        speedProfile: createTTSSpeedProfile("A"),
        quality: "A",
        costPerMillionChars: 0.5
      }
    ], buildTTSModelEstimation),
    voices: [
      { id: "Aoede", name: "Aoede", description: "Balanced expressive preview voice" }
    ]
  },
  grok: {
    name: "Grok TTS",
    models: attachModelEstimations([
      {
        id: "grok-tts-beta",
        name: "Grok TTS Beta",
        description: "xAI speech synthesis with simple voice selection",
        speedProfile: createTTSSpeedProfile("A"),
        quality: "B",
        costPerMillionChars: 15
      }
    ], buildTTSModelEstimation),
    voices: [
      { id: "eve", name: "Eve", description: "Warm and natural conversational voice" }
    ]
  },
  groq: {
    name: "Groq Orpheus TTS",
    models: attachModelEstimations([
      {
        id: "canopylabs/orpheus-v1-english",
        name: "Orpheus v1",
        description: "High-speed English speech synthesis optimized for Groq",
        speedProfile: createTTSSpeedProfile("A"),
        quality: "B",
        costPerMillionChars: 6
      }
    ], buildTTSModelEstimation),
    voices: [
      { id: "autumn", name: "Autumn", description: "Female, expressive range" },
      { id: "diana", name: "Diana", description: "Female, clear and professional" },
      { id: "hannah", name: "Hannah", description: "Female, warm and friendly" },
      { id: "austin", name: "Austin", description: "Male, confident and articulate" },
      { id: "daniel", name: "Daniel", description: "Male, calm and measured" },
      { id: "troy", name: "Troy", description: "Male, natural and conversational" }
    ]
  },
  runway: {
    name: "Runway TTS",
    models: attachModelEstimations([
      {
        id: "eleven_multilingual_v2",
        name: "Eleven Multilingual v2",
        description: "Runway TTS backed by ElevenLabs multilingual synthesis",
        speedProfile: createTTSSpeedProfile("A"),
        quality: "A",
        costPerMillionChars: 66
      }
    ], buildTTSModelEstimation),
    voices: [
      { id: "Leslie", name: "Leslie", description: "Clear general-purpose narration voice" }
    ]
  },
  deapi: {
    name: "deAPI TTS",
    models: attachModelEstimations([
      {
        id: "Kokoro",
        name: "Kokoro",
        description: "deAPI hosted Kokoro speech synthesis",
        speedProfile: createTTSSpeedProfile("A"),
        quality: "B",
        costPerMillionChars: 2
      }
    ], buildTTSModelEstimation),
    voices: [
      { id: "af_sky", name: "Sky", description: "Bright English narration voice" }
    ]
  }
}

export const getDefaultTTSModel = (service: TTSServiceType): string => {
  return TTS_CONFIG[service].models[0]!.id
}

const getTTSModelsForService = (service: TTSServiceType) => {
  return TTS_CONFIG[service].models
}

const getTTSModelIdsForService = (service: TTSServiceType): string[] => {
  return getTTSModelsForService(service).map(model => model.id)
}

export const isValidTTSModel = (service: TTSServiceType, model: string): boolean => {
  return getTTSModelIdsForService(service).includes(model)
}

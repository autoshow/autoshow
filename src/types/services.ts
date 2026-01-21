import * as v from 'valibot'

export const TranscriptionServiceTypeSchema = v.union([
  v.literal('groq'),
  v.literal('deepinfra'),
  v.literal('happyscribe'),
  v.literal('lemonfox')
])

export const LLMServiceTypeSchema = v.union([
  v.literal('openai'),
  v.literal('anthropic'),
  v.literal('gemini')
])

export type LLMServiceType = v.InferOutput<typeof LLMServiceTypeSchema>

export const TTSServiceTypeSchema = v.union([
  v.literal('openai'),
  v.literal('elevenlabs')
])

export const ServiceModelSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  name: v.pipe(v.string(), v.nonEmpty()),
  description: v.string(),
  speed: v.string(),
  quality: v.string(),
  secsPerMin: v.optional(v.pipe(v.number(), v.minValue(0)))
})

export const ServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  models: v.pipe(v.array(ServiceModelSchema), v.minLength(1))
})

export const TTSVoiceSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  name: v.pipe(v.string(), v.nonEmpty()),
  description: v.string()
})

export const TTSServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  model: v.pipe(v.string(), v.nonEmpty()),
  voices: v.pipe(v.array(TTSVoiceSchema), v.minLength(1))
})

export const ImageGenServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  model: v.pipe(v.string(), v.nonEmpty()),
  description: v.string()
})

export const MusicGenreInfoSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  name: v.pipe(v.string(), v.nonEmpty()),
  description: v.string()
})

export const MusicServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  model: v.pipe(v.string(), v.nonEmpty()),
  description: v.string(),
  genres: v.pipe(v.array(MusicGenreInfoSchema), v.minLength(1))
})

export const VideoSizeInfoSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  name: v.pipe(v.string(), v.nonEmpty()),
  description: v.string()
})

export const VideoGenServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  models: v.pipe(v.array(ServiceModelSchema), v.minLength(1)),
  sizes: v.pipe(v.array(VideoSizeInfoSchema), v.minLength(1)),
  durations: v.pipe(v.array(v.pipe(v.number(), v.integer(), v.minValue(1))), v.minLength(1))
})

export const ServicesConfigSchema = v.object({
  transcription: v.object({
    whisper: v.object({
      groq: ServiceConfigSchema,
      deepinfra: ServiceConfigSchema
    }),
    diarization: v.object({
      lemonfox: ServiceConfigSchema
    }),
    streaming: v.object({
      happyscribe: ServiceConfigSchema
    })
  }),
  llm: v.object({
    openai: ServiceConfigSchema,
    anthropic: ServiceConfigSchema,
    gemini: ServiceConfigSchema
  }),
  tts: v.object({
    openai: TTSServiceConfigSchema,
    elevenlabs: TTSServiceConfigSchema
  }),
  imageGen: v.object({
    openai: ImageGenServiceConfigSchema
  }),
  music: v.object({
    elevenlabs: MusicServiceConfigSchema
  }),
  videoGen: v.object({
    openai: VideoGenServiceConfigSchema
  })
})

export type TranscriptionServiceType = v.InferOutput<typeof TranscriptionServiceTypeSchema>
export type ServicesConfig = v.InferOutput<typeof ServicesConfigSchema>

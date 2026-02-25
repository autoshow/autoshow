import * as v from 'valibot'
import type { ServicesConfig } from './services-types'

export const TTSServiceTypeSchema = v.union([
  v.literal('openai'),
  v.literal('elevenlabs'),
  v.literal('groq')
])

export type TTSServiceType = v.InferOutput<typeof TTSServiceTypeSchema>

export const Step5MetadataSchema = v.object({
  ttsService: v.union([v.literal('openai'), v.literal('elevenlabs'), v.literal('groq')]),
  ttsModel: v.pipe(v.string(), v.nonEmpty()),
  ttsVoice: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  audioFileName: v.pipe(v.string(), v.nonEmpty()),
  audioFileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  audioDuration: v.pipe(v.number(), v.minValue(0)),
  inputTextLength: v.pipe(v.number(), v.integer(), v.minValue(0)),
  ttsS3Url: v.optional(v.string(), undefined)
})

export const TTSServiceSchema = v.union([v.literal('openai'), v.literal('elevenlabs'), v.literal('groq')])

export type Step5Metadata = v.InferOutput<typeof Step5MetadataSchema>

export const ttsModelSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  name: v.pipe(v.string(), v.nonEmpty()),
  description: v.string(),
  speed: v.string(),
  quality: v.string()
})

export const ttsVoiceSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  name: v.pipe(v.string(), v.nonEmpty()),
  description: v.string()
})

export const ttsServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  models: v.pipe(v.array(ttsModelSchema), v.minLength(1)),
  voices: v.pipe(v.array(ttsVoiceSchema), v.minLength(1))
})

export type TTSConfig = ServicesConfig['tts']

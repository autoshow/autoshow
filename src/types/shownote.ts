import * as v from 'valibot'
import {
  Step1MetadataSchema,
  Step2MetadataSchema,
  Step3MetadataSchema,
  Step4MetadataSchema,
  Step5MetadataSchema,
  Step6MetadataSchema,
  Step7MetadataSchema,
  Step8MetadataSchema
} from './steps'

export const ProcessingMetadataSchema = v.object({
  step1: Step1MetadataSchema,
  step2: Step2MetadataSchema,
  step3: Step3MetadataSchema,
  step4: Step4MetadataSchema,
  step5: v.optional(Step5MetadataSchema, undefined),
  step6: v.optional(Step6MetadataSchema, undefined),
  step7: v.optional(Step7MetadataSchema, undefined),
  step8: v.optional(Step8MetadataSchema, undefined)
})

export const MetadataInputSchema = v.object({
  url: v.pipe(v.string(), v.nonEmpty()),
  title: v.pipe(v.string(), v.nonEmpty()),
  author: v.optional(v.string(), undefined),
  duration: v.optional(v.string(), undefined)
})

export const ShowNoteSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  url: v.pipe(v.string(), v.nonEmpty()),
  title: v.pipe(v.string(), v.nonEmpty()),
  author: v.nullable(v.string()),
  duration: v.nullable(v.string()),
  prompt: v.string(),
  summary: v.string(),
  transcription: v.string(),
  transcription_service: v.union([v.literal('groq'), v.literal('deepinfra'), v.literal('happyscribe'), v.literal('lemonfox')]),
  transcription_model: v.nullable(v.string()),
  llm_service: v.union([v.literal('openai'), v.literal('anthropic'), v.literal('gemini')]),
  llm_model: v.nullable(v.string()),
  processed_at: v.pipe(v.number(), v.integer(), v.minValue(0)),
  created_at: v.pipe(v.number(), v.integer(), v.minValue(0)),
  video_publish_date: v.nullable(v.string()),
  video_thumbnail: v.nullable(v.string()),
  channel_url: v.nullable(v.string()),
  audio_file_name: v.nullable(v.string()),
  audio_file_size: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  transcription_processing_time: v.nullable(v.pipe(v.number(), v.minValue(0))),
  transcription_token_count: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  llm_processing_time: v.nullable(v.pipe(v.number(), v.minValue(0))),
  llm_input_token_count: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  llm_output_token_count: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  selected_prompts: v.nullable(v.string()),
  tts_enabled: v.nullable(v.pipe(v.number(), v.integer())),
  tts_service: v.nullable(v.union([v.literal('openai'), v.literal('elevenlabs')])),
  tts_model: v.nullable(v.string()),
  tts_voice: v.nullable(v.string()),
  tts_audio_file: v.nullable(v.string()),
  tts_processing_time: v.nullable(v.pipe(v.number(), v.minValue(0))),
  tts_audio_duration: v.nullable(v.pipe(v.number(), v.minValue(0))),
  image_gen_enabled: v.nullable(v.pipe(v.number(), v.integer())),
  image_gen_service: v.nullable(v.literal('openai')),
  image_gen_model: v.nullable(v.string()),
  images_generated: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  image_gen_processing_time: v.nullable(v.pipe(v.number(), v.minValue(0))),
  selected_image_prompts: v.nullable(v.string()),
  image_files: v.nullable(v.string()),
  music_gen_enabled: v.nullable(v.pipe(v.number(), v.integer())),
  music_gen_service: v.nullable(v.literal('elevenlabs')),
  music_gen_model: v.nullable(v.string()),
  music_gen_genre: v.nullable(v.string()),
  music_gen_file: v.nullable(v.string()),
  music_gen_processing_time: v.nullable(v.pipe(v.number(), v.minValue(0))),
  music_gen_duration: v.nullable(v.pipe(v.number(), v.minValue(0))),
  music_gen_lyrics_length: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  music_gen_lyrics_generation_time: v.nullable(v.pipe(v.number(), v.minValue(0))),
  music_gen_lyrics: v.nullable(v.string()),
  video_gen_enabled: v.nullable(v.pipe(v.number(), v.integer())),
  video_gen_service: v.nullable(v.literal('openai')),
  video_gen_model: v.nullable(v.string()),
  videos_generated: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  video_gen_processing_time: v.nullable(v.pipe(v.number(), v.minValue(0))),
  selected_video_prompts: v.nullable(v.string()),
  video_size: v.nullable(v.string()),
  video_duration: v.nullable(v.pipe(v.number(), v.minValue(0))),
  video_files: v.nullable(v.string())
})

export const ShowNoteInputSchema = v.object({
  url: v.pipe(v.string(), v.nonEmpty()),
  title: v.pipe(v.string(), v.nonEmpty()),
  author: v.optional(v.string(), undefined),
  duration: v.optional(v.string(), undefined),
  prompt: v.string(),
  summary: v.string(),
  transcription: v.string(),
  transcriptionService: v.union([v.literal('groq'), v.literal('deepinfra'), v.literal('happyscribe'), v.literal('lemonfox')]),
  transcriptionModel: v.optional(v.string(), undefined),
  llmService: v.union([v.literal('openai'), v.literal('anthropic'), v.literal('gemini')]),
  llmModel: v.optional(v.string(), undefined),
  processedAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  metadata: v.optional(ProcessingMetadataSchema, undefined),
  selectedPrompts: v.array(v.string())
})

export type ProcessingMetadata = v.InferOutput<typeof ProcessingMetadataSchema>
export type ShowNote = v.InferOutput<typeof ShowNoteSchema>
export type ShowNoteInput = v.InferOutput<typeof ShowNoteInputSchema>

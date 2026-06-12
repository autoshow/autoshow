import * as v from 'valibot'
import {
DocumentExtractionModelUnionSchema,
DocumentExtractionServiceTypeSchema,
} from './step-2-document-types'
import { LLMServiceTypeSchema,TTSServiceTypeSchema } from './step-3-types'
import { ImageGenServiceTypeSchema,MusicBitrateSchema,MusicPresetSchema,MusicSampleRateSchema,MusicServiceTypeSchema,VideoGenServiceTypeSchema,VideoPromptTypeSchema,VideoSizeSchema } from './step-4-types'

export const PresetIdSchema = v.pipe(
  v.string(),
  v.nonEmpty(),
  v.regex(/^[a-zA-Z0-9_-]+$/, 'Preset ID must contain only alphanumeric characters, hyphens, and underscores')
)

export const PresetCompatibilityKeySchema = v.union([
  v.literal('document'),
  v.literal('audio-file'),
  v.literal('audio-streaming'),
])

export const PresetConfigSchema = v.object({
  compatibilityKey: PresetCompatibilityKeySchema,
  transcriptionOption: v.optional(v.string(), undefined),
  transcriptionModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  documentService: v.optional(DocumentExtractionServiceTypeSchema, undefined),
  documentModel: v.optional(DocumentExtractionModelUnionSchema, undefined),
  llmEnabled: v.boolean(),
  selectedPrompts: v.array(v.pipe(v.string(), v.nonEmpty())),
  llmService: v.optional(LLMServiceTypeSchema, undefined),
  llmModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  llmCustomInstructions: v.optional(v.string(), undefined),
  ttsWithLlm: v.boolean(),
  ttsService: v.optional(TTSServiceTypeSchema, undefined),
  ttsVoice: v.optional(v.string(), undefined),
  ttsModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  imageEnabled: v.boolean(),
  imageService: v.optional(ImageGenServiceTypeSchema, undefined),
  imageModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  imageDimensionOrRatio: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  selectedImagePrompts: v.array(v.pipe(v.string(), v.nonEmpty())),
  imageCustomInstructions: v.optional(v.string(), undefined),
  musicEnabled: v.boolean(),
  musicService: v.optional(MusicServiceTypeSchema, undefined),
  musicModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  selectedMusicGenre: v.optional(v.string(), undefined),
  musicPreset: v.optional(MusicPresetSchema, undefined),
  musicDurationSeconds: v.optional(v.pipe(v.number(), v.integer(), v.minValue(3), v.maxValue(300)), undefined),
  musicInstrumental: v.boolean(),
  musicSampleRate: v.optional(MusicSampleRateSchema, undefined),
  musicBitrate: v.optional(MusicBitrateSchema, undefined),
  musicCustomInstructions: v.optional(v.string(), undefined),
  videoEnabled: v.boolean(),
  videoService: v.optional(VideoGenServiceTypeSchema, undefined),
  selectedVideoPrompts: v.array(VideoPromptTypeSchema),
  videoModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  videoSize: v.optional(VideoSizeSchema, undefined),
  videoDuration: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), undefined),
  videoAspectRatio: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  videoCustomInstructions: v.optional(v.string(), undefined),
})

const PresetVersionSchema = v.pipe(v.number(), v.integer(), v.minValue(1))

export const PresetRecordSchema = v.object({
  id: PresetIdSchema,
  name: v.pipe(v.string(), v.nonEmpty()),
  compatibilityKey: PresetCompatibilityKeySchema,
  version: PresetVersionSchema,
  config: PresetConfigSchema,
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  updatedAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

export const PresetUpsertBodySchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  config: PresetConfigSchema,
  version: v.optional(PresetVersionSchema, 1),
})

export const PresetPatchBodySchema = v.object({
  name: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  config: v.optional(PresetConfigSchema, undefined),
  version: v.optional(PresetVersionSchema, undefined),
})

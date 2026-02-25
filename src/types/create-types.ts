import * as v from 'valibot'
import type { SetStoreFunction } from "solid-js/store"
import type { Action } from "@solidjs/router"
import { LLMServiceTypeSchema } from './step-4-types'
import { ImageGenServiceTypeSchema } from './step-6-types'
import { MusicServiceTypeSchema, MusicPresetSchema, MusicSampleRateSchema, MusicBitrateSchema } from './step-7-types'
import { VideoGenServiceTypeSchema } from './step-8-types'

export const StepsStateSchema = v.object({
  transcriptionOption: v.string(),
  transcriptionModel: v.pipe(v.string(), v.nonEmpty()),
  selectedPrompts: v.array(v.string()),
  llmService: LLMServiceTypeSchema,
  llmModel: v.pipe(v.string(), v.nonEmpty()),
  ttsSkipped: v.boolean(),
  ttsService: v.string(),
  ttsVoice: v.string(),
  ttsModel: v.pipe(v.string(), v.nonEmpty()),
  imageGenSkipped: v.boolean(),
  imageService: ImageGenServiceTypeSchema,
  imageModel: v.pipe(v.string(), v.nonEmpty()),
  imageDimensionOrRatio: v.pipe(v.string(), v.nonEmpty()),
  selectedImagePrompts: v.array(v.string()),
  musicGenSkipped: v.boolean(),
  musicService: MusicServiceTypeSchema,
  musicModel: v.pipe(v.string(), v.nonEmpty()),
  selectedMusicGenre: v.string(),
  musicPreset: MusicPresetSchema,
  musicDurationSeconds: v.pipe(v.number(), v.integer(), v.minValue(3), v.maxValue(300)),
  musicInstrumental: v.boolean(),
  musicSampleRate: v.optional(MusicSampleRateSchema, undefined),
  musicBitrate: v.optional(MusicBitrateSchema, undefined),
  videoGenSkipped: v.boolean(),
  videoService: VideoGenServiceTypeSchema,
  selectedVideoPrompts: v.array(v.string()),
  videoModel: v.pipe(v.string(), v.nonEmpty()),
  videoSize: v.string(),
  videoDuration: v.number(),
  videoAspectRatio: v.string(),
  selectedFile: v.nullable(v.any()),
  uploadedFilePath: v.string(),
  uploadedFileName: v.string(),
  uploadedFileDuration: v.optional(v.number(), undefined),
  isUploading: v.boolean(),
  uploadError: v.string(),
  uploadProgress: v.number(),
  urlValue: v.string(),
  isVerifying: v.boolean(),
  urlMetadata: v.any(),
  urlVerified: v.boolean(),
  documentService: v.string(),
  documentModel: v.string()
})

export type StepsState = v.InferOutput<typeof StepsStateSchema>

export type StepsProps = {
  state: StepsState
  setState: SetStoreFunction<StepsState>
  isProcessing: () => boolean
  canSubmit: () => boolean
  submitAction: Action<[FormData], { jobId: string }>
}

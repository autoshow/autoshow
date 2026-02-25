import * as v from 'valibot'
import {
  Step1CombinedMetadataSchema,
  InputTypeSchema
} from './step-1-types'
import {
  SupportedDocumentTypeSchema,
  DocumentExtractionServiceTypeSchema,
  DocumentExtractionModelUnionSchema,
  DocumentBackupMetadataSchema
} from './step-2-document-types'
import { Step2CombinedMetadataSchema } from './step-2-transcription-types'
import { Step3MetadataSchema } from './step-3-types'
import { LLMServiceTypeSchema, Step4MetadataSchema } from './step-4-types'
import { Step5MetadataSchema } from './step-5-types'
import { ImageGenServiceTypeSchema, Step6MetadataSchema } from './step-6-types'
import { MusicServiceTypeSchema, MusicGenreSchema, MusicPresetSchema, MusicSampleRateSchema, MusicBitrateSchema, Step7MetadataSchema } from './step-7-types'
import { VideoGenServiceTypeSchema, VideoSizeSchema, VideoModelSchema, VideoPromptTypeSchema, Step8MetadataSchema } from './step-8-types'

export const ProcessingMetadataSchema = v.object({
  step1: Step1CombinedMetadataSchema,
  step2: Step2CombinedMetadataSchema,
  step3: Step3MetadataSchema,
  step4: Step4MetadataSchema,
  step5: v.optional(Step5MetadataSchema, undefined),
  step6: v.optional(Step6MetadataSchema, undefined),
  step7: v.optional(Step7MetadataSchema, undefined),
  step8: v.optional(Step8MetadataSchema, undefined),
  backup: v.optional(DocumentBackupMetadataSchema, undefined)
})

export type ProcessingMetadata = v.InferOutput<typeof ProcessingMetadataSchema>

export const ProcessingOptionsSchema = v.object({
  url: v.pipe(v.string(), v.nonEmpty(), v.url()),
  llmService: LLMServiceTypeSchema,
  llmModel: v.pipe(v.string(), v.nonEmpty()),
  outputDir: v.string(),
  transcriptionService: v.union([v.literal('groq'), v.literal('deepinfra'), v.literal('happyscribe'), v.literal('fal'), v.literal('gladia'), v.literal('elevenlabs'), v.literal('rev'), v.literal('assembly'), v.literal('deepgram'), v.literal('soniox')]),
  isLocalFile: v.optional(v.boolean(), undefined),
  localFilePath: v.optional(v.string(), undefined),
  localFileName: v.optional(v.string(), undefined),
  selectedPrompts: v.pipe(v.array(v.pipe(v.string(), v.nonEmpty())), v.minLength(1)),
  urlType: v.optional(v.union([v.literal('youtube'), v.literal('streaming'), v.literal('direct-file'), v.literal('document')]), undefined),
  urlDuration: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  urlFileSize: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  useResilientDownload: v.optional(v.boolean(), false),
  transcriptionModel: v.pipe(v.string(), v.nonEmpty()),
  ttsEnabled: v.optional(v.boolean(), false),
  ttsService: v.optional(v.union([v.literal('openai'), v.literal('elevenlabs'), v.literal('groq')]), undefined),
  ttsVoice: v.optional(v.string(), undefined),
  ttsModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  imageGenEnabled: v.optional(v.boolean(), false),
  imageService: v.optional(ImageGenServiceTypeSchema, undefined),
  imageModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  imageDimensionOrRatio: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  selectedImagePrompts: v.optional(v.array(v.pipe(v.string(), v.nonEmpty())), undefined),
  musicGenEnabled: v.optional(v.boolean(), false),
  musicService: v.optional(MusicServiceTypeSchema, undefined),
  musicModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  selectedMusicGenre: v.optional(MusicGenreSchema, undefined),
  musicPreset: v.optional(MusicPresetSchema, undefined),
  musicDurationSeconds: v.optional(v.pipe(v.number(), v.integer(), v.minValue(3), v.maxValue(300)), undefined),
  musicInstrumental: v.optional(v.boolean(), undefined),
  musicSampleRate: v.optional(MusicSampleRateSchema, undefined),
  musicBitrate: v.optional(MusicBitrateSchema, undefined),
  videoGenEnabled: v.optional(v.boolean(), false),
  videoService: v.optional(VideoGenServiceTypeSchema, undefined),
  videoModel: v.optional(VideoModelSchema, undefined),
  selectedVideoPrompts: v.optional(v.array(VideoPromptTypeSchema), undefined),
  videoSize: v.optional(VideoSizeSchema, undefined),
  videoDuration: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), undefined),
  videoAspectRatio: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  inputType: v.optional(InputTypeSchema, 'audio-video'),
  documentService: v.optional(DocumentExtractionServiceTypeSchema, undefined),
  documentModel: v.optional(DocumentExtractionModelUnionSchema, undefined),
  documentType: v.optional(SupportedDocumentTypeSchema, undefined),
  documentUrl: v.optional(v.string(), undefined),
  disableDocumentCache: v.optional(v.boolean(), false),
  documentBackupUrl: v.optional(v.string(), undefined),
  documentBackupKey: v.optional(v.string(), undefined),
  documentPageCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), undefined)
})

export type ProcessingOptions = v.InferOutput<typeof ProcessingOptionsSchema>

export const ProcessingFormDataSchema = v.object({
  url: v.optional(v.string()),
  transcriptionOption: v.pipe(v.string(), v.nonEmpty()),
  transcriptionModel: v.pipe(v.string(), v.nonEmpty()),
  llmService: LLMServiceTypeSchema,
  llmModel: v.pipe(v.string(), v.nonEmpty()),
  uploadedFilePath: v.optional(v.string()),
  uploadedFileName: v.optional(v.string()),
  selectedPrompts: v.pipe(v.string(), v.nonEmpty()),
  urlType: v.optional(v.string()),
  urlDuration: v.optional(v.string()),
  urlFileSize: v.optional(v.string()),
  ttsEnabled: v.optional(v.string()),
  ttsService: v.optional(v.string()),
  ttsVoice: v.optional(v.string()),
  ttsModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  imageGenEnabled: v.optional(v.string()),
  imageService: v.optional(ImageGenServiceTypeSchema),
  imageModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  imageDimensionOrRatio: v.optional(v.string()),
  selectedImagePrompts: v.optional(v.string()),
  musicGenSkipped: v.optional(v.string()),
  musicService: v.optional(MusicServiceTypeSchema),
  musicModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  selectedMusicGenre: v.optional(v.string()),
  musicPreset: v.optional(MusicPresetSchema),
  musicDurationSeconds: v.optional(v.pipe(v.string(), v.nonEmpty())),
  musicInstrumental: v.optional(v.string()),
  musicSampleRate: v.optional(v.pipe(v.string(), v.nonEmpty())),
  musicBitrate: v.optional(v.pipe(v.string(), v.nonEmpty())),
  videoGenEnabled: v.optional(v.string()),
  videoService: v.optional(VideoGenServiceTypeSchema),
  selectedVideoPrompts: v.optional(v.string()),
  videoModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  videoSize: v.optional(v.string()),
  videoDuration: v.optional(v.string()),
  videoAspectRatio: v.optional(v.string()),
  inputType: v.optional(v.string()),
  documentService: v.optional(DocumentExtractionServiceTypeSchema),
  documentModel: v.optional(DocumentExtractionModelUnionSchema),
  documentType: v.optional(SupportedDocumentTypeSchema),
  disableDocumentCache: v.optional(v.string())
})

export type ProcessingFormData = v.InferOutput<typeof ProcessingFormDataSchema>

import type { VideoMetadata } from './step-1-types'
import type { Step1Metadata, Step1DocumentMetadata } from './step-1-types'
import type { Step2CombinedMetadata, TranscriptionResult } from './step-2-transcription-types'
import type { IProgressTracker } from './progress-types'
import type { DocumentBackupMetadata } from './step-2-document-types'
import type { JSX } from 'solid-js'

export type PipelineParams = {
  showNoteId: string
  jobId: string
  metadata: VideoMetadata
  step1Metadata: Step1Metadata | Step1DocumentMetadata
  transcriptionResult: { result: TranscriptionResult, metadata: Step2CombinedMetadata }
  processingOptions: ProcessingOptions
  progressTracker: IProgressTracker
  backupMetadata?: DocumentBackupMetadata | null
}

export type MetadataItemConfig = {
  label: string
  value: JSX.Element | string
  when?: boolean
}

export type StepConfig = {
  title: string
  enabled?: boolean | number | null | undefined
  items: MetadataItemConfig[]
  when?: boolean
}

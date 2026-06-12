import * as v from 'valibot'
import type {
ProcessingMetadata,
Step4Metadata,
Step5Metadata,
Step6Metadata,
Step7Metadata,
Step8Metadata,
} from '../backend/backend-types'
import {
InputTypeSchema,
Step1CombinedMetadataSchema
} from './step-1-types'
import {
DocumentBackupMetadataSchema,
DocumentExtractionModelUnionSchema,
DocumentExtractionServiceTypeSchema,
SupportedDocumentTypeSchema
} from './step-2-document-types'
import { Step2CombinedMetadataSchema,TranscriptionServiceTypeSchema } from './step-2-transcription-types'
import { LLMServiceTypeSchema,Step4MetadataSchema,Step5MetadataSchema,TTSServiceTypeSchema } from './step-3-types'
import { ImageGenServiceTypeSchema,MusicBitrateSchema,MusicGenreSchema,MusicPresetSchema,MusicSampleRateSchema,MusicServiceTypeSchema,Step6MetadataSchema,Step7MetadataSchema,Step8MetadataSchema,VideoGenServiceTypeSchema,VideoModelSchema,VideoPromptTypeSchema,VideoSizeSchema } from './step-4-types'
import { UploadIdSchema } from './upload-types'

export const WriteModeSchema = v.picklist(['skip', 'write', 'write+tts'])

export const WriteAndTtsMetadataSchema = v.object({
  mode: WriteModeSchema,
  llm: v.optional(Step4MetadataSchema, undefined),
  tts: v.optional(Step5MetadataSchema, undefined),
})

export const RunMediaMetadataSchema = v.object({
  imageEnabled: v.boolean(),
  videoEnabled: v.boolean(),
  musicEnabled: v.boolean(),
  image: v.optional(Step6MetadataSchema, undefined),
  video: v.optional(Step8MetadataSchema, undefined),
  music: v.optional(Step7MetadataSchema, undefined),
})

const GroupedProcessingMetadataSchema = v.object({
  step1: Step1CombinedMetadataSchema,
  step2: Step2CombinedMetadataSchema,
  step3: v.optional(WriteAndTtsMetadataSchema, undefined),
  step4: v.optional(RunMediaMetadataSchema, undefined),
  backup: v.optional(DocumentBackupMetadataSchema, undefined)
})

export const ProcessingMetadataSchema = GroupedProcessingMetadataSchema

const getWriteAndTtsMetadata = (
  metadata: ProcessingMetadata
): v.InferOutput<typeof WriteAndTtsMetadataSchema> | undefined => {
  return metadata.step3
}

export const getRunMediaMetadata = (
  metadata: ProcessingMetadata
): v.InferOutput<typeof RunMediaMetadataSchema> | undefined => {
  return metadata.step4
}

export const getLlmProcessingMetadata = (
  metadata: ProcessingMetadata
): Step4Metadata | undefined => {
  return getWriteAndTtsMetadata(metadata)?.llm
}

export const getTtsProcessingMetadata = (
  metadata: ProcessingMetadata
): Step5Metadata | undefined => {
  return getWriteAndTtsMetadata(metadata)?.tts
}

export const getImageProcessingMetadata = (
  metadata: ProcessingMetadata
): Step6Metadata | undefined => {
  return getRunMediaMetadata(metadata)?.image
}

export const getVideoProcessingMetadata = (
  metadata: ProcessingMetadata
): Step8Metadata | undefined => {
  return getRunMediaMetadata(metadata)?.video
}

export const getMusicProcessingMetadata = (
  metadata: ProcessingMetadata
): Step7Metadata | undefined => {
  return getRunMediaMetadata(metadata)?.music
}

export const ProcessingOptionsSchema = v.object({
  url: v.pipe(v.string(), v.nonEmpty(), v.url()),
  uploadId: v.optional(UploadIdSchema, undefined),
  llmEnabled: v.optional(v.boolean(), false),
  llmService: v.optional(LLMServiceTypeSchema, undefined),
  llmModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  llmCustomInstructions: v.optional(v.string(), undefined),
  outputDir: v.string(),
  transcriptionService: TranscriptionServiceTypeSchema,
  isLocalFile: v.optional(v.boolean(), undefined),
  localFilePath: v.optional(v.string(), undefined),
  localFileName: v.optional(v.string(), undefined),
  localFileSize: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  selectedPrompts: v.optional(v.array(v.pipe(v.string(), v.nonEmpty())), []),
  urlType: v.optional(v.union([v.literal('youtube'), v.literal('streaming'), v.literal('direct-file'), v.literal('document')]), undefined),
  urlDuration: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  urlFileSize: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  useResilientDownload: v.optional(v.boolean(), false),
  transcriptionModel: v.pipe(v.string(), v.nonEmpty()),
  ttsEnabled: v.optional(v.boolean(), false),
  ttsService: v.optional(TTSServiceTypeSchema, undefined),
  ttsVoice: v.optional(v.string(), undefined),
  ttsModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  imageGenEnabled: v.optional(v.boolean(), false),
  imageService: v.optional(ImageGenServiceTypeSchema, undefined),
  imageModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  imageDimensionOrRatio: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  selectedImagePrompts: v.optional(v.array(v.pipe(v.string(), v.nonEmpty())), undefined),
  imageCustomInstructions: v.optional(v.string(), undefined),
  musicGenEnabled: v.optional(v.boolean(), false),
  musicService: v.optional(MusicServiceTypeSchema, undefined),
  musicModel: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  selectedMusicGenre: v.optional(MusicGenreSchema, undefined),
  musicPreset: v.optional(MusicPresetSchema, undefined),
  musicDurationSeconds: v.optional(v.pipe(v.number(), v.integer(), v.minValue(3), v.maxValue(300)), undefined),
  musicInstrumental: v.optional(v.boolean(), undefined),
  musicSampleRate: v.optional(MusicSampleRateSchema, undefined),
  musicBitrate: v.optional(MusicBitrateSchema, undefined),
  musicCustomInstructions: v.optional(v.string(), undefined),
  videoGenEnabled: v.optional(v.boolean(), false),
  videoService: v.optional(VideoGenServiceTypeSchema, undefined),
  videoModel: v.optional(VideoModelSchema, undefined),
  selectedVideoPrompts: v.optional(v.array(VideoPromptTypeSchema), undefined),
  videoSize: v.optional(VideoSizeSchema, undefined),
  videoDuration: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), undefined),
  videoAspectRatio: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined),
  videoCustomInstructions: v.optional(v.string(), undefined),
  inputType: v.optional(InputTypeSchema, 'audio-video'),
  documentService: v.optional(DocumentExtractionServiceTypeSchema, undefined),
  documentModel: v.optional(DocumentExtractionModelUnionSchema, undefined),
  documentType: v.optional(SupportedDocumentTypeSchema, undefined),
  documentUrl: v.optional(v.string(), undefined),
  disableDocumentCache: v.optional(v.boolean(), false),
  documentBackupUrl: v.optional(v.string(), undefined),
  documentBackupKey: v.optional(v.string(), undefined),
  documentPageCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), undefined),
  estimatedCostUsd: v.optional(v.number(), undefined)
})

export const ProcessingFormDataSchema = v.object({
  url: v.optional(v.string()),
  uploadId: v.optional(UploadIdSchema),
  transcriptionOption: v.optional(v.pipe(v.string(), v.nonEmpty())),
  transcriptionModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  llmEnabled: v.optional(v.string()),
  llmService: v.optional(LLMServiceTypeSchema),
  llmModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  selectedPrompts: v.optional(v.string()),
  llmCustomInstructions: v.optional(v.string()),
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
  imageCustomInstructions: v.optional(v.string()),
  musicGenEnabled: v.optional(v.string()),
  musicService: v.optional(MusicServiceTypeSchema),
  musicModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  selectedMusicGenre: v.optional(v.string()),
  musicPreset: v.optional(MusicPresetSchema),
  musicDurationSeconds: v.optional(v.pipe(v.string(), v.nonEmpty())),
  musicInstrumental: v.optional(v.string()),
  musicSampleRate: v.optional(v.pipe(v.string(), v.nonEmpty())),
  musicBitrate: v.optional(v.pipe(v.string(), v.nonEmpty())),
  musicCustomInstructions: v.optional(v.string()),
  videoGenEnabled: v.optional(v.string()),
  videoService: v.optional(VideoGenServiceTypeSchema),
  selectedVideoPrompts: v.optional(v.string()),
  videoModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  videoSize: v.optional(v.string()),
  videoDuration: v.optional(v.string()),
  videoAspectRatio: v.optional(v.string()),
  videoCustomInstructions: v.optional(v.string()),
  inputType: v.optional(v.string()),
  documentService: v.optional(DocumentExtractionServiceTypeSchema),
  documentModel: v.optional(DocumentExtractionModelUnionSchema),
  documentType: v.optional(SupportedDocumentTypeSchema),
  disableDocumentCache: v.optional(v.string()),
  documentPageCount: v.optional(v.string())
})

export const AppendAssetsFormDataSchema = v.object({
  llmEnabled: v.optional(v.string()),
  llmService: v.optional(LLMServiceTypeSchema),
  llmModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  selectedPrompts: v.optional(v.string()),
  llmCustomInstructions: v.optional(v.string()),
  ttsEnabled: v.optional(v.string()),
  ttsService: v.optional(v.string()),
  ttsVoice: v.optional(v.string()),
  ttsModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  imageGenEnabled: v.optional(v.string()),
  imageService: v.optional(ImageGenServiceTypeSchema),
  imageModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  imageDimensionOrRatio: v.optional(v.string()),
  selectedImagePrompts: v.optional(v.string()),
  imageCustomInstructions: v.optional(v.string()),
  musicGenEnabled: v.optional(v.string()),
  musicService: v.optional(MusicServiceTypeSchema),
  musicModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  selectedMusicGenre: v.optional(v.string()),
  musicPreset: v.optional(MusicPresetSchema),
  musicDurationSeconds: v.optional(v.pipe(v.string(), v.nonEmpty())),
  musicInstrumental: v.optional(v.string()),
  musicSampleRate: v.optional(v.pipe(v.string(), v.nonEmpty())),
  musicBitrate: v.optional(v.pipe(v.string(), v.nonEmpty())),
  musicCustomInstructions: v.optional(v.string()),
  videoGenEnabled: v.optional(v.string()),
  videoService: v.optional(VideoGenServiceTypeSchema),
  selectedVideoPrompts: v.optional(v.string()),
  videoModel: v.optional(v.pipe(v.string(), v.nonEmpty())),
  videoSize: v.optional(v.string()),
  videoDuration: v.optional(v.string()),
  videoAspectRatio: v.optional(v.string()),
  videoCustomInstructions: v.optional(v.string())
})

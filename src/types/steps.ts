import * as v from 'valibot'
import type { SetStoreFunction } from "solid-js/store"
import type { Action } from "@solidjs/router"
import { LLMServiceTypeSchema } from './services'

export const StepsStateSchema = v.object({
  transcriptionOption: v.string(),
  transcriptionModel: v.string(),
  selectedPrompts: v.array(v.string()),
  llmService: LLMServiceTypeSchema,
  llmModel: v.string(),
  ttsSkipped: v.boolean(),
  ttsService: v.string(),
  ttsVoice: v.string(),
  imageGenSkipped: v.boolean(),
  selectedImagePrompts: v.array(v.string()),
  musicGenSkipped: v.boolean(),
  selectedMusicGenre: v.string(),
  videoGenSkipped: v.boolean(),
  selectedVideoPrompts: v.array(v.string()),
  videoModel: v.string(),
  videoSize: v.string(),
  videoDuration: v.number(),
  selectedFile: v.nullable(v.any()),
  uploadedFilePath: v.string(),
  uploadedFileName: v.string(),
  isUploading: v.boolean(),
  uploadError: v.string(),
  uploadProgress: v.number(),
  urlValue: v.string(),
  isVerifying: v.boolean(),
  urlMetadata: v.any(),
  urlVerified: v.boolean()
})

export type StepsState = v.InferOutput<typeof StepsStateSchema>

export type StepsProps = {
  state: StepsState
  setState: SetStoreFunction<StepsState>
  isProcessing: () => boolean
  canSubmit: () => boolean
  handleFileChange: (file: File | null) => Promise<void>
  handleVerifyUrl: () => Promise<void>
  submitAction: Action<[FormData], { jobId: string }>
}

export const VideoMetadataSchema = v.object({
  title: v.pipe(v.string(), v.nonEmpty()),
  duration: v.string(),
  author: v.string(),
  description: v.string(),
  url: v.pipe(v.string(), v.nonEmpty(), v.url()),
  publishDate: v.optional(v.string(), undefined),
  thumbnail: v.optional(v.string(), undefined),
  channelUrl: v.optional(v.string(), undefined)
})

export const Step1MetadataSchema = v.object({
  videoUrl: v.pipe(v.string(), v.nonEmpty()),
  videoTitle: v.pipe(v.string(), v.nonEmpty()),
  videoPublishDate: v.optional(v.string(), undefined),
  videoThumbnail: v.optional(v.string(), undefined),
  channelTitle: v.string(),
  channelUrl: v.optional(v.string(), undefined),
  duration: v.string(),
  audioFileName: v.pipe(v.string(), v.nonEmpty()),
  audioFileSize: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const YouTubeApiVideoInfoSchema = v.object({
  id: v.optional(v.string(), undefined),
  snippet: v.optional(v.object({
    publishedAt: v.optional(v.string(), undefined),
    channelId: v.optional(v.string(), undefined),
    title: v.optional(v.string(), undefined),
    description: v.optional(v.string(), undefined),
    thumbnails: v.optional(v.any(), undefined),
    channelTitle: v.optional(v.string(), undefined)
  }), undefined),
  contentDetails: v.optional(v.object({
    duration: v.optional(v.string(), undefined)
  }), undefined)
})

export const UrlTypeSchema = v.union([
  v.literal('youtube'),
  v.literal('streaming'),
  v.literal('direct-file'),
  v.literal('invalid')
])

export const UrlMetadataSchema = v.object({
  urlType: UrlTypeSchema,
  duration: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  fileSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), undefined),
  fileSizeFormatted: v.optional(v.string(), undefined),
  durationFormatted: v.optional(v.string(), undefined),
  mimeType: v.optional(v.string(), undefined),
  error: v.optional(v.string(), undefined)
})

export const DurationResultSchema = v.object({
  duration: v.pipe(v.number(), v.minValue(0)),
  formatted: v.string(),
  method: v.union([v.literal('hls'), v.literal('ffprobe_http'), v.literal('full'), v.literal('skipped')]),
  requiresFullDownload: v.boolean()
})

export type VideoMetadata = v.InferOutput<typeof VideoMetadataSchema>
export type Step1Metadata = v.InferOutput<typeof Step1MetadataSchema>
export type YouTubeApiVideoInfo = v.InferOutput<typeof YouTubeApiVideoInfoSchema>
export type UrlType = v.InferOutput<typeof UrlTypeSchema>
export type UrlMetadata = v.InferOutput<typeof UrlMetadataSchema>
export type DurationResult = v.InferOutput<typeof DurationResultSchema>

export const TranscriptionSegmentSchema = v.object({
  start: v.string(),
  end: v.string(),
  text: v.string(),
  speaker: v.optional(v.string(), undefined)
})

export const TranscriptionResultSchema = v.object({
  text: v.string(),
  segments: v.array(TranscriptionSegmentSchema)
})

export const Step2MetadataSchema = v.object({
  transcriptionService: v.union([v.literal('groq'), v.literal('deepinfra'), v.literal('happyscribe'), v.literal('lemonfox')]),
  transcriptionModel: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  tokenCount: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const HappyScribeWordSchema = v.object({
  text: v.string(),
  type: v.string(),
  data_start: v.pipe(v.number(), v.minValue(0)),
  data_end: v.pipe(v.number(), v.minValue(0)),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1))
})

export const HappyScribeSegmentSchema = v.object({
  speaker: v.string(),
  speaker_number: v.pipe(v.number(), v.integer(), v.minValue(0)),
  words: v.array(HappyScribeWordSchema)
})

export const HappyScribeJsonOutputSchema = v.array(HappyScribeSegmentSchema)

export type TranscriptionSegment = v.InferOutput<typeof TranscriptionSegmentSchema>
export type TranscriptionResult = v.InferOutput<typeof TranscriptionResultSchema>
export type Step2Metadata = v.InferOutput<typeof Step2MetadataSchema>
export type HappyScribeWord = v.InferOutput<typeof HappyScribeWordSchema>
export type HappyScribeSegment = v.InferOutput<typeof HappyScribeSegmentSchema>
export type HappyScribeJsonOutput = v.InferOutput<typeof HappyScribeJsonOutputSchema>

export const ChapterSchema = v.object({
  timestamp: v.string(),
  title: v.pipe(v.string(), v.nonEmpty()),
  description: v.string()
})

export const LLMResponseSchema = v.object({
  episodeDescription: v.string(),
  episodeSummary: v.string(),
  chapters: v.array(ChapterSchema)
})

export const Step3MetadataSchema = v.object({
  selectedPrompts: v.pipe(v.array(v.pipe(v.string(), v.nonEmpty())), v.minLength(1))
})

export const Step4MetadataSchema = v.object({
  llmService: LLMServiceTypeSchema,
  llmModel: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  inputTokenCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  outputTokenCount: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export type Step3Metadata = v.InferOutput<typeof Step3MetadataSchema>
export type Step4Metadata = v.InferOutput<typeof Step4MetadataSchema>

export const Step5MetadataSchema = v.object({
  ttsService: v.union([v.literal('openai'), v.literal('elevenlabs')]),
  ttsModel: v.pipe(v.string(), v.nonEmpty()),
  ttsVoice: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  audioFileName: v.pipe(v.string(), v.nonEmpty()),
  audioFileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  audioDuration: v.pipe(v.number(), v.minValue(0)),
  inputTextLength: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export type Step5Metadata = v.InferOutput<typeof Step5MetadataSchema>

export const ImageGenerationResultSchema = v.object({
  promptType: v.pipe(v.string(), v.nonEmpty()),
  fileName: v.pipe(v.string(), v.nonEmpty()),
  fileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  revisedPrompt: v.optional(v.string(), undefined)
})

export const Step6MetadataSchema = v.object({
  imageGenService: v.literal('openai'),
  imageGenModel: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  imagesGenerated: v.pipe(v.number(), v.integer(), v.minValue(0)),
  selectedPrompts: v.array(v.pipe(v.string(), v.nonEmpty())),
  results: v.array(ImageGenerationResultSchema)
})

export type ImageGenerationResult = v.InferOutput<typeof ImageGenerationResultSchema>
export type Step6Metadata = v.InferOutput<typeof Step6MetadataSchema>

export const MusicGenreSchema = v.union([
  v.literal('rap'),
  v.literal('rock'),
  v.literal('pop'),
  v.literal('country'),
  v.literal('folk'),
  v.literal('jazz')
])

export const Step7MetadataSchema = v.object({
  musicService: v.literal('elevenlabs'),
  musicModel: v.pipe(v.string(), v.nonEmpty()),
  selectedGenre: MusicGenreSchema,
  processingTime: v.pipe(v.number(), v.minValue(0)),
  musicFileName: v.pipe(v.string(), v.nonEmpty()),
  musicFileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  musicDuration: v.pipe(v.number(), v.minValue(0)),
  lyricsLength: v.pipe(v.number(), v.integer(), v.minValue(0)),
  lyricsGenerationTime: v.pipe(v.number(), v.minValue(0)),
  lyricsText: v.string()
})

export type MusicGenre = v.InferOutput<typeof MusicGenreSchema>
export type Step7Metadata = v.InferOutput<typeof Step7MetadataSchema>

export const VideoSizeSchema = v.union([
  v.literal('1920x1080'),
  v.literal('1080x1920'),
  v.literal('1280x720'),
  v.literal('720x1280')
])

export const VideoModelSchema = v.union([
  v.literal('sora-2'),
  v.literal('sora-2-pro')
])

export const VideoPromptTypeSchema = v.union([
  v.literal('explainer'),
  v.literal('highlight'),
  v.literal('intro'),
  v.literal('outro'),
  v.literal('social')
])

export const VideoGenerationResultSchema = v.object({
  promptType: v.pipe(v.string(), v.nonEmpty()),
  fileName: v.pipe(v.string(), v.nonEmpty()),
  fileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  duration: v.pipe(v.number(), v.minValue(0)),
  size: v.pipe(v.string(), v.nonEmpty()),
  thumbnailFileName: v.optional(v.string(), undefined),
  scenePrompt: v.optional(v.string(), undefined),
  scenePromptGenerationTime: v.optional(v.pipe(v.number(), v.minValue(0)), undefined)
})

export const Step8MetadataSchema = v.object({
  videoGenService: v.literal('openai'),
  videoGenModel: VideoModelSchema,
  processingTime: v.pipe(v.number(), v.minValue(0)),
  videosGenerated: v.pipe(v.number(), v.integer(), v.minValue(0)),
  selectedPrompts: v.array(v.pipe(v.string(), v.nonEmpty())),
  selectedSize: VideoSizeSchema,
  selectedDuration: v.pipe(v.number(), v.integer(), v.minValue(1)),
  results: v.array(VideoGenerationResultSchema)
})

export type VideoSize = v.InferOutput<typeof VideoSizeSchema>
export type VideoModel = v.InferOutput<typeof VideoModelSchema>
export type VideoPromptType = v.InferOutput<typeof VideoPromptTypeSchema>
export type VideoGenerationResult = v.InferOutput<typeof VideoGenerationResultSchema>
export type Step8Metadata = v.InferOutput<typeof Step8MetadataSchema>

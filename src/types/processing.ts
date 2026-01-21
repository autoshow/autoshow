import * as v from 'valibot'
import { VideoSizeSchema, VideoModelSchema, VideoPromptTypeSchema } from './steps'
import { LLMServiceTypeSchema } from './services'

export const ProcessingOptionsSchema = v.object({
  url: v.pipe(v.string(), v.nonEmpty(), v.url()),
  llmService: v.optional(LLMServiceTypeSchema, 'openai'),
  llmModel: v.pipe(v.string(), v.nonEmpty()),
  outputDir: v.string(),
  transcriptionService: v.union([v.literal('groq'), v.literal('deepinfra'), v.literal('happyscribe'), v.literal('lemonfox')]),
  isLocalFile: v.optional(v.boolean(), undefined),
  localFilePath: v.optional(v.string(), undefined),
  localFileName: v.optional(v.string(), undefined),
  selectedPrompts: v.pipe(v.array(v.pipe(v.string(), v.nonEmpty())), v.minLength(1)),
  urlType: v.optional(v.union([v.literal('youtube'), v.literal('streaming'), v.literal('direct-file')]), undefined),
  urlDuration: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  urlFileSize: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  useResilientDownload: v.optional(v.boolean(), false),
  transcriptionModel: v.optional(v.string(), undefined),
  ttsEnabled: v.optional(v.boolean(), false),
  ttsService: v.optional(v.union([v.literal('openai'), v.literal('elevenlabs')]), undefined),
  ttsVoice: v.optional(v.string(), undefined),
  ttsModel: v.optional(v.string(), undefined),
  imageGenEnabled: v.optional(v.boolean(), false),
  imageService: v.optional(v.union([v.literal('openai')]), undefined),
  selectedImagePrompts: v.optional(v.array(v.pipe(v.string(), v.nonEmpty())), undefined),
  musicGenEnabled: v.optional(v.boolean(), false),
  musicService: v.optional(v.union([v.literal('elevenlabs')]), undefined),
  selectedMusicGenre: v.optional(v.union([
    v.literal('rap'),
    v.literal('rock'),
    v.literal('pop'),
    v.literal('country'),
    v.literal('folk'),
    v.literal('jazz')
  ]), undefined),
  videoGenEnabled: v.optional(v.boolean(), false),
  videoService: v.optional(v.union([v.literal('openai')]), undefined),
  videoModel: v.optional(VideoModelSchema, undefined),
  selectedVideoPrompts: v.optional(v.array(VideoPromptTypeSchema), undefined),
  videoSize: v.optional(VideoSizeSchema, undefined),
  videoDuration: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), undefined)
})

export const DownloadOptionsSchema = v.object({
  url: v.pipe(v.string(), v.nonEmpty()),
  outputPath: v.pipe(v.string(), v.nonEmpty()),
  maxConnections: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  maxSplit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  retryWait: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)))
})

export type ProcessingOptions = v.InferOutput<typeof ProcessingOptionsSchema>
export type DownloadOptions = v.InferOutput<typeof DownloadOptionsSchema>

export const ConvertToAudioResultSchema = v.object({
  wavPath: v.pipe(v.string(), v.nonEmpty()),
  mp3Path: v.pipe(v.string(), v.nonEmpty()),
  duration: v.optional(v.pipe(v.number(), v.minValue(0)))
})

export type ConvertToAudioResult = v.InferOutput<typeof ConvertToAudioResultSchema>

export const VideoJobResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  object: v.string(),
  created_at: v.pipe(v.number(), v.integer(), v.minValue(0)),
  status: v.union([v.literal('queued'), v.literal('in_progress'), v.literal('completed'), v.literal('failed')]),
  model: v.pipe(v.string(), v.nonEmpty()),
  progress: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100))),
  seconds: v.optional(v.string()),
  size: v.optional(v.string()),
  prompt: v.optional(v.string()),
  completed_at: v.nullish(v.pipe(v.number(), v.integer(), v.minValue(0))),
  expires_at: v.nullish(v.pipe(v.number(), v.integer(), v.minValue(0))),
  error: v.nullish(v.object({
    message: v.string(),
    code: v.optional(v.string())
  }))
})

export const GenerateVideoResultSchema = v.object({
  videoPath: v.pipe(v.string(), v.nonEmpty()),
  thumbnailPath: v.optional(v.string()),
  fileSize: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export type VideoJobResponse = v.InferOutput<typeof VideoJobResponseSchema>
export type GenerateVideoResult = v.InferOutput<typeof GenerateVideoResultSchema>

import * as v from 'valibot'
import type { ServicesConfig } from './services-types'

export const VideoGenServiceTypeSchema = v.union([
  v.literal('openai'),
  v.literal('gemini'),
  v.literal('minimax'),
  v.literal('grok')
])

export const VideoSizeSchema = v.pipe(v.string(), v.nonEmpty())

export const VideoModelSchema = v.pipe(v.string(), v.nonEmpty())

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
  cost: v.pipe(v.number(), v.minValue(0)),
  thumbnailFileName: v.optional(v.string(), undefined),
  scenePrompt: v.optional(v.string(), undefined),
  scenePromptGenerationTime: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  s3Url: v.optional(v.string(), undefined),
  thumbnailS3Url: v.optional(v.string(), undefined)
})

export const Step8MetadataSchema = v.object({
  videoGenService: VideoGenServiceTypeSchema,
  videoGenModel: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  videosGenerated: v.pipe(v.number(), v.integer(), v.minValue(0)),
  selectedPrompts: v.array(v.pipe(v.string(), v.nonEmpty())),
  selectedSize: v.pipe(v.string(), v.nonEmpty()),
  selectedDuration: v.pipe(v.number(), v.integer(), v.minValue(1)),
  totalCost: v.pipe(v.number(), v.minValue(0)),
  results: v.array(VideoGenerationResultSchema)
})

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

export type VideoGenServiceType = v.InferOutput<typeof VideoGenServiceTypeSchema>
export type VideoSize = v.InferOutput<typeof VideoSizeSchema>
export type VideoModel = v.InferOutput<typeof VideoModelSchema>
export type VideoPromptType = v.InferOutput<typeof VideoPromptTypeSchema>

export type VideoPromptConfig = {
  title: string
  description: string
  typeDescription: string
  styleInstructions: string
}
export type VideoGenerationResult = v.InferOutput<typeof VideoGenerationResultSchema>
export type Step8Metadata = v.InferOutput<typeof Step8MetadataSchema>
export type VideoJobResponse = v.InferOutput<typeof VideoJobResponseSchema>
export type GenerateVideoResult = v.InferOutput<typeof GenerateVideoResultSchema>

export type VeoResolution = '720p' | '1080p' | '4k'

export type VeoAspectRatio = '16:9' | '9:16'

export type VeoVideo = {
  uri?: string
  mimeType?: string
  sizeBytes?: number
}

export type VeoGeneratedVideo = {
  video?: VeoVideo
}

export type VeoOperation = {
  name?: string
  done?: boolean
  response?: {
    generatedVideos?: VeoGeneratedVideo[]
  }
  error?: {
    message?: string
    code?: number
  }
}

export type SoraSize = '720x1280' | '1280x720' | '1024x1792' | '1792x1024'

export const videoGenServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  models: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string(),
    speed: v.string(),
    quality: v.string(),
    costPerSecond: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
    secsPerMin: v.optional(v.pipe(v.number(), v.minValue(0))),
    centicentsPerMin: v.optional(v.pipe(v.number(), v.minValue(0))),
    knowledge: v.optional(v.string()),
    releaseDate: v.optional(v.string()),
    lastUpdated: v.optional(v.string()),
    modalities: v.optional(v.object({
      input: v.array(v.string()),
      output: v.array(v.string())
    })),
    cost: v.optional(v.object({
      input: v.number(),
      output: v.number(),
      cacheRead: v.optional(v.number())
    })),
    limit: v.optional(v.object({
      context: v.number(),
      input: v.optional(v.number()),
      output: v.number()
    }))
  })), v.minLength(1)),
  sizes: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string()
  })), v.minLength(1)),
  durations: v.pipe(v.array(v.pipe(v.number(), v.integer(), v.minValue(1))), v.minLength(1)),
  aspectRatios: v.optional(v.pipe(v.array(v.pipe(v.string(), v.nonEmpty())), v.minLength(1)), undefined)
})

export type VideoConfig = ServicesConfig['videoGen']

export type GrokResolution = '720p' | '480p'

export type GrokAspectRatio = '16:9' | '4:3' | '1:1' | '9:16' | '3:4' | '3:2' | '2:3'

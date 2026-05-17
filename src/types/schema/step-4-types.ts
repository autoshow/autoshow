import * as v from 'valibot'
import { ModelEstimationSchema } from './estimation-types'
import { SpeedProfileSchema } from './speed-types'

// Step 4: media generation

export const ImageGenServiceTypeSchema = v.union([
  v.literal('openai'),
  v.literal('gemini'),
  v.literal('minimax'),
  v.literal('grok'),
  v.literal('runway'),
  v.literal('deepinfra'),
  v.literal('deapi'),
  v.literal('flux'),
  v.literal('glm')
])

export const ImageGenerationResultSchema = v.object({
  promptType: v.pipe(v.string(), v.nonEmpty()),
  fileName: v.pipe(v.string(), v.nonEmpty()),
  fileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  cost: v.pipe(v.number(), v.minValue(0)),
  actualCost: v.optional(v.number(), undefined),
  revisedPrompt: v.optional(v.string(), undefined),
  s3Url: v.optional(v.string(), undefined)
})

export const Step6MetadataSchema = v.object({
  imageGenService: ImageGenServiceTypeSchema,
  imageGenModel: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  imagesGenerated: v.pipe(v.number(), v.integer(), v.minValue(0)),
  totalCost: v.pipe(v.number(), v.minValue(0)),
  actualCostUsd: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  selectedPrompts: v.array(v.pipe(v.string(), v.nonEmpty())),
  results: v.array(ImageGenerationResultSchema)
})

export const imageGenServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  models: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string(),
    estimation: ModelEstimationSchema,
    speedProfile: SpeedProfileSchema,
    quality: v.string(),
    costPerImage: v.union([
      v.pipe(v.number(), v.minValue(0)),
      v.record(v.pipe(v.string(), v.nonEmpty()), v.pipe(v.number(), v.minValue(0)))
    ])
  })), v.minLength(1)),
  aspectRatios: v.optional(v.pipe(v.array(v.pipe(v.string(), v.nonEmpty())), v.minLength(1)), undefined),
  dimensions: v.optional(v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty())
  })), v.minLength(1)), undefined)
})

export const MusicServiceTypeSchema = v.union([
  v.literal('elevenlabs'),
  v.literal('minimax'),
  v.literal('deapi')
])

export const MusicGenreSchema = v.pipe(v.string(), v.nonEmpty())
export const MusicPresetSchema = v.picklist(['cheap', 'balanced', 'quality'])
export const MusicSampleRateSchema = v.picklist([16000, 24000, 32000, 44100])
export const MusicBitrateSchema = v.picklist([32000, 64000, 128000, 256000])

export const MusicGenerationOptionsSchema = v.object({
  musicPreset: MusicPresetSchema,
  musicDurationSeconds: v.pipe(v.number(), v.integer(), v.minValue(3), v.maxValue(300)),
  musicInstrumental: v.boolean(),
  musicSampleRate: v.optional(MusicSampleRateSchema, undefined),
  musicBitrate: v.optional(MusicBitrateSchema, undefined),
  customInstructions: v.optional(v.string(), undefined)
})

export const Step7MetadataSchema = v.object({
  musicService: MusicServiceTypeSchema,
  musicModel: v.pipe(v.string(), v.nonEmpty()),
  selectedGenre: MusicGenreSchema,
  processingTime: v.pipe(v.number(), v.minValue(0)),
  musicFileName: v.pipe(v.string(), v.nonEmpty()),
  musicFileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  musicDuration: v.pipe(v.number(), v.minValue(0)),
  lyricsLength: v.pipe(v.number(), v.integer(), v.minValue(0)),
  lyricsGenerationTime: v.pipe(v.number(), v.minValue(0)),
  lyricsText: v.string(),
  totalCost: v.pipe(v.number(), v.minValue(0)),
  actualCostUsd: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  llmInputTokenCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), undefined),
  llmOutputTokenCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), undefined),
  llmCost: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  llmCostUsd: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  musicPreset: MusicPresetSchema,
  targetDurationSeconds: v.pipe(v.number(), v.integer(), v.minValue(3), v.maxValue(300)),
  instrumental: v.boolean(),
  sampleRate: v.optional(MusicSampleRateSchema, undefined),
  bitrate: v.optional(MusicBitrateSchema, undefined),
  musicS3Url: v.optional(v.string(), undefined)
})

export const musicServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  description: v.string(),
  models: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string(),
    estimation: ModelEstimationSchema,
    speedProfile: SpeedProfileSchema,
    quality: v.string(),
    costPerMinute: v.pipe(v.number(), v.minValue(0))
  })), v.minLength(1)),
  genres: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string()
  })), v.minLength(1))
})

export const VideoGenServiceTypeSchema = v.union([
  v.literal('gemini'),
  v.literal('deepinfra'),
  v.literal('minimax'),
  v.literal('grok'),
  v.literal('runway'),
  v.literal('glm'),
  v.literal('deapi')
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
  actualCostUsd: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  llmInputTokenCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), undefined),
  llmOutputTokenCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), undefined),
  llmCost: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  llmCostUsd: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  results: v.array(VideoGenerationResultSchema)
})

const RunwayTaskStatusSchema = v.picklist([
  'PENDING',
  'THROTTLED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELED',
  'CANCELLED'
])

export const RunwayTaskResponseSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  status: RunwayTaskStatusSchema,
  createdAt: v.optional(v.pipe(v.string(), v.nonEmpty())),
  output: v.optional(v.array(v.pipe(v.string(), v.nonEmpty()))),
  error: v.optional(v.object({
    message: v.optional(v.string()),
    code: v.optional(v.string())
  }))
})

export const GenerateVideoResultSchema = v.object({
  videoPath: v.pipe(v.string(), v.nonEmpty()),
  thumbnailPath: v.optional(v.string()),
  fileSize: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const videoGenServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  models: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string(),
    estimation: ModelEstimationSchema,
    speedProfile: SpeedProfileSchema,
    quality: v.string(),
    costPerSecond: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
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

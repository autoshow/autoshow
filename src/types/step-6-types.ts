import * as v from 'valibot'
import type { IProgressTracker } from './progress-types'
import type { ServicesConfig } from './services-types'

export const ImageGenServiceTypeSchema = v.union([
  v.literal('openai'),
  v.literal('gemini'),
  v.literal('minimax'),
  v.literal('grok')
])

export const ImageGenerationResultSchema = v.object({
  promptType: v.pipe(v.string(), v.nonEmpty()),
  fileName: v.pipe(v.string(), v.nonEmpty()),
  fileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  cost: v.pipe(v.number(), v.minValue(0)),
  revisedPrompt: v.optional(v.string(), undefined),
  s3Url: v.optional(v.string(), undefined)
})

export const Step6MetadataSchema = v.object({
  imageGenService: ImageGenServiceTypeSchema,
  imageGenModel: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  imagesGenerated: v.pipe(v.number(), v.integer(), v.minValue(0)),
  totalCost: v.pipe(v.number(), v.minValue(0)),
  selectedPrompts: v.array(v.pipe(v.string(), v.nonEmpty())),
  results: v.array(ImageGenerationResultSchema)
})

export type ImageGenServiceType = v.InferOutput<typeof ImageGenServiceTypeSchema>
export type ImageGenerationResult = v.InferOutput<typeof ImageGenerationResultSchema>
export type Step6Metadata = v.InferOutput<typeof Step6MetadataSchema>

export type ImageGenerator = (
  title: string,
  textOutput: string,
  selectedPrompts: string[],
  outputDir: string,
  model: string,
  dimensionOrRatio: string,
  progressTracker?: IProgressTracker
) => Promise<{ results: ImageGenerationResult[], metadata: Step6Metadata }>

export const imageGenServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  models: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string(),
    speed: v.string(),
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

export type ImageConfig = ServicesConfig['imageGen']

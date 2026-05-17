import type * as v from 'valibot'
import type { RunMediaMetadataSchema } from '../../schema/process-types'
import type {
GenerateVideoResultSchema,
ImageGenerationResultSchema,
MusicGenerationOptionsSchema,
RunwayTaskResponseSchema,
VideoGenerationResultSchema,
VideoModelSchema
} from '../../schema/step-4-types'

export type RunMediaMetadata = v.InferOutput<typeof RunMediaMetadataSchema>
export type ImageGenerationResult = v.InferOutput<typeof ImageGenerationResultSchema>
export type MusicGenerationOptions = v.InferOutput<typeof MusicGenerationOptionsSchema>
export type VideoModel = v.InferOutput<typeof VideoModelSchema>
export type VideoGenerationResult = v.InferOutput<typeof VideoGenerationResultSchema>
export type RunwayTaskResponse = v.InferOutput<typeof RunwayTaskResponseSchema>
export type GenerateVideoResult = v.InferOutput<typeof GenerateVideoResultSchema>

export type VeoResolution = '720p' | '1080p' | '4k'
export type VeoAspectRatio = '16:9' | '9:16'

export type VeoOperation = {
  name?: string
  done?: boolean
  response?: {
    generatedVideos?: Array<{
      video?: {
        uri?: string
        mimeType?: string
        sizeBytes?: number
      }
    }>
  }
  error?: {
    message?: string
    code?: number
  }
}

export type GrokResolution = '720p' | '480p'
export type GrokAspectRatio = '16:9' | '4:3' | '1:1' | '9:16' | '3:4' | '3:2' | '2:3'

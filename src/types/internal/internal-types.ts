import type * as v from 'valibot'
import type {
DocumentLlmCostEstimationSchema,
DocumentLlmDurationEstimationSchema,
ImageCostEstimationSchema,
ImageDurationEstimationSchema,
LLMCostEstimationSchema,
LLMDurationEstimationSchema,
ModelEstimationSchema
} from '../schema/estimation-types'
import type { ServicesConfigSchema } from '../schema/services-types'
import type { SpeedOperationProfileSchema } from '../schema/speed-types'
import type { Step1DocumentMetadataSchema } from '../schema/step-1-types'
import type { Step2CombinedMetadataSchema } from '../schema/step-2-transcription-types'

export type LLMCostEstimation = v.InferOutput<typeof LLMCostEstimationSchema>
export type DocumentLlmCostEstimation = v.InferOutput<typeof DocumentLlmCostEstimationSchema>
export type ImageCostEstimation = v.InferOutput<typeof ImageCostEstimationSchema>
export type LLMDurationEstimation = v.InferOutput<typeof LLMDurationEstimationSchema>
export type DocumentLlmDurationEstimation = v.InferOutput<typeof DocumentLlmDurationEstimationSchema>
export type ImageDurationEstimation = v.InferOutput<typeof ImageDurationEstimationSchema>
export type ModelEstimation = v.InferOutput<typeof ModelEstimationSchema>

type ServicesConfig = v.InferOutput<typeof ServicesConfigSchema>
export type SpeedOperationProfile = v.InferOutput<typeof SpeedOperationProfileSchema>
export type Step1DocumentMetadata = v.InferOutput<typeof Step1DocumentMetadataSchema>
export type DocumentConfig = ServicesConfig['documentExtraction']
export type Step2CombinedMetadata = v.InferOutput<typeof Step2CombinedMetadataSchema>
export type LLMConfig = ServicesConfig['llm']

export type ImagePromptConfig = {
  title: string
  description: string
  template: string
}

export type VideoPromptConfig = {
  title: string
  description: string
  typeDescription: string
  styleInstructions: string
}

import type * as v from 'valibot'
import type { StepsStateSchema } from '../schema/create-types'
import type { JobSchema } from '../schema/jobs-types'
import type { PresetCompatibilityKeySchema,PresetRecordSchema } from '../schema/preset-types'
import type { ShowNoteAssetKindSchema,ShowNoteAssetSchema,ShowNoteSchema } from '../schema/shownote-types'
import type { UrlMetadataSchema,YouTubeCaptionMetadataSchema } from '../schema/step-1-types'
import type {
DocumentExtractionServiceTypeSchema,
DocumentRuntimeCapabilitiesSchema,
SupportedDocumentTypeSchema
} from '../schema/step-2-document-types'
import type {
LLMServiceTypeSchema,
StructuredLLMResponseSchema,
TTSServiceTypeSchema
} from '../schema/step-3-types'
import type {
ImageGenServiceTypeSchema,
MusicPresetSchema,
MusicServiceTypeSchema,
VideoGenServiceTypeSchema,
VideoPromptTypeSchema
} from '../schema/step-4-types'

export type StepsState = v.InferOutput<typeof StepsStateSchema>
export type Job = v.InferOutput<typeof JobSchema>
export type PresetCompatibilityKey = v.InferOutput<typeof PresetCompatibilityKeySchema>
export type PresetRecord = v.InferOutput<typeof PresetRecordSchema>
export type ShowNote = v.InferOutput<typeof ShowNoteSchema>
export type ShowNoteAssetKind = v.InferOutput<typeof ShowNoteAssetKindSchema>
export type ShowNoteAsset = v.InferOutput<typeof ShowNoteAssetSchema>
export type UrlMetadata = v.InferOutput<typeof UrlMetadataSchema>
export type YouTubeCaptionMetadata = v.InferOutput<typeof YouTubeCaptionMetadataSchema>
export type DocumentExtractionServiceType = v.InferOutput<typeof DocumentExtractionServiceTypeSchema>
export type DocumentRuntimeCapabilities = v.InferOutput<typeof DocumentRuntimeCapabilitiesSchema>
export type SupportedDocumentType = v.InferOutput<typeof SupportedDocumentTypeSchema>

export type PromptType =
  | 'shortSummary'
  | 'mediumSummary'
  | 'longSummary'
  | 'bulletPoints'
  | 'takeaways'
  | 'faq'
  | 'shortChapters'
  | 'mediumChapters'
  | 'longChapters'
  | 'quotes'
  | 'titles'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'tiktok'
  | 'x'
  | 'poetryCollection'
  | 'screenplay'
  | 'shortStory'
  | 'contentStrategy'
  | 'emailNewsletter'
  | 'seoArticle'
  | 'courseCurriculum'
  | 'questions'
  | 'assessmentGenerator'
  | 'literatureReview'
  | 'flashcards'
  | 'howToGuide'
  | 'studyGuide'
  | 'trainingManual'
  | 'troubleshootingGuide'
  | 'pressRelease'
  | 'competitiveAnalysis'
  | 'trendAnalysis'
  | 'meetingActions'
  | 'voiceReflection'
  | 'goalSetting'
  | 'careerPlan'
  | 'progressAnalysis'

export type RenderedTextOutputMap = Partial<Record<PromptType, string>>
export type RenderedAssetTextOutputMaps = Record<string, RenderedTextOutputMap>
export type ShowNoteStorageLink = {
  label: string
  viewHref: string
  downloadHref: string
  uploadedAt?: number
}

export type LLMServiceType = v.InferOutput<typeof LLMServiceTypeSchema>
export type StructuredLLMResponse = v.InferOutput<typeof StructuredLLMResponseSchema>
export type TTSServiceType = v.InferOutput<typeof TTSServiceTypeSchema>
export type ImageGenServiceType = v.InferOutput<typeof ImageGenServiceTypeSchema>
export type MusicPreset = v.InferOutput<typeof MusicPresetSchema>
export type MusicServiceType = v.InferOutput<typeof MusicServiceTypeSchema>
export type VideoGenServiceType = v.InferOutput<typeof VideoGenServiceTypeSchema>
export type VideoPromptType = v.InferOutput<typeof VideoPromptTypeSchema>

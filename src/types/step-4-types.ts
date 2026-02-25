import * as v from 'valibot'
import type { ServicesConfig } from './services-types'

export const LLMServiceTypeSchema = v.union([
  v.literal('openai'),
  v.literal('claude'),
  v.literal('gemini'),
  v.literal('minimax'),
  v.literal('grok'),
  v.literal('groq')
])

export const Step4MetadataSchema = v.object({
  llmService: LLMServiceTypeSchema,
  llmModel: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  inputTokenCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  outputTokenCount: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const StructuredChapterSchema = v.object({
  timestamp: v.pipe(v.string(), v.regex(/^\d{2}:\d{2}:\d{2}$/, 'Timestamp must be HH:MM:SS format')),
  title: v.pipe(v.string(), v.minLength(1, 'Title cannot be empty')),
  description: v.pipe(v.string(), v.minLength(1, 'Description cannot be empty'))
})

export const FAQItemSchema = v.object({
  question: v.pipe(v.string(), v.minLength(1)),
  answer: v.pipe(v.string(), v.minLength(1))
})

export const StructuredLLMResponseSchema = v.object({
  text: v.optional(v.string()),
  shortSummary: v.optional(v.string()),
  mediumSummary: v.optional(v.string()),
  longSummary: v.optional(v.string()),
  bulletPoints: v.optional(v.array(v.string())),
  takeaways: v.optional(v.array(v.string())),
  faq: v.optional(v.array(FAQItemSchema)),
  shortChapters: v.optional(v.array(StructuredChapterSchema)),
  mediumChapters: v.optional(v.array(StructuredChapterSchema)),
  longChapters: v.optional(v.array(StructuredChapterSchema)),
  quotes: v.optional(v.array(v.string())),
  titles: v.optional(v.array(v.string())),
  facebook: v.optional(v.string()),
  instagram: v.optional(v.string()),
  linkedin: v.optional(v.string()),
  tiktok: v.optional(v.string()),
  x: v.optional(v.string()),
  poetryCollection: v.optional(v.string()),
  screenplay: v.optional(v.string()),
  shortStory: v.optional(v.string()),
  contentStrategy: v.optional(v.string()),
  emailNewsletter: v.optional(v.string()),
  seoArticle: v.optional(v.string()),
  courseCurriculum: v.optional(v.string()),
  questions: v.optional(v.array(v.string())),
  assessmentGenerator: v.optional(v.string()),
  flashcards: v.optional(v.array(v.object({
    question: v.pipe(v.string(), v.minLength(1)),
    answer: v.pipe(v.string(), v.minLength(1))
  }))),
  howToGuide: v.optional(v.string()),
  studyGuide: v.optional(v.string()),
  trainingManual: v.optional(v.string()),
  troubleshootingGuide: v.optional(v.string()),
  pressRelease: v.optional(v.string()),
  competitiveAnalysis: v.optional(v.string()),
  trendAnalysis: v.optional(v.string()),
  meetingActions: v.optional(v.string()),
  voiceReflection: v.optional(v.string()),
  goalSetting: v.optional(v.string()),
  careerPlan: v.optional(v.string()),
  progressAnalysis: v.optional(v.string())
})

export type LLMServiceType = v.InferOutput<typeof LLMServiceTypeSchema>
export type Step4Metadata = v.InferOutput<typeof Step4MetadataSchema>
export type StructuredChapter = v.InferOutput<typeof StructuredChapterSchema>
export type FAQItem = v.InferOutput<typeof FAQItemSchema>
export type StructuredLLMResponse = v.InferOutput<typeof StructuredLLMResponseSchema>

export type StructuredOutputProvider = 'openai' | 'claude' | 'gemini' | 'minimax' | 'grok' | 'groq'

export type LLMAttempt = {
  provider: StructuredOutputProvider
  model: string
}

export type PromptType = 'shortSummary' | 'mediumSummary' | 'longSummary' | 'bulletPoints' | 'takeaways' | 'faq' | 'shortChapters' | 'mediumChapters' | 'longChapters' | 'quotes' | 'titles' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'x' | 'poetryCollection' | 'screenplay' | 'shortStory' | 'contentStrategy' | 'emailNewsletter' | 'seoArticle' | 'courseCurriculum' | 'questions' | 'assessmentGenerator' | 'flashcards' | 'howToGuide' | 'studyGuide' | 'trainingManual' | 'troubleshootingGuide' | 'pressRelease' | 'competitiveAnalysis' | 'trendAnalysis' | 'meetingActions' | 'voiceReflection' | 'goalSetting' | 'careerPlan' | 'progressAnalysis'

export const llmServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  models: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string(),
    speed: v.string(),
    quality: v.string(),
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
  })), v.minLength(1))
})

export type LLMConfig = ServicesConfig['llm']

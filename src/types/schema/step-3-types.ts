import * as v from 'valibot'
import { ModelEstimationSchema } from './estimation-types'
import { SpeedProfileSchema } from './speed-types'

// Step 3: write and TTS

export const LLMServiceTypeSchema = v.union([
  v.literal('openai'),
  v.literal('claude'),
  v.literal('gemini'),
  v.literal('minimax'),
  v.literal('deepinfra'),
  v.literal('grok'),
  v.literal('groq'),
  v.literal('glm')
])

export const Step4MetadataSchema = v.object({
  llmService: LLMServiceTypeSchema,
  llmModel: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  inputTokenCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  outputTokenCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  totalCost: v.optional(v.pipe(v.number(), v.minValue(0))),
  actualCostUsd: v.optional(v.pipe(v.number(), v.minValue(0)))
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
  literatureReview: v.optional(v.string()),
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

export const TTSServiceTypeSchema = v.union([
  v.literal('openai'),
  v.literal('elevenlabs'),
  v.literal('deepgram'),
  v.literal('gemini'),
  v.literal('grok'),
  v.literal('groq'),
  v.literal('runway'),
  v.literal('deapi')
])

export const Step5MetadataSchema = v.object({
  ttsService: TTSServiceTypeSchema,
  ttsModel: v.pipe(v.string(), v.nonEmpty()),
  ttsVoice: v.pipe(v.string(), v.nonEmpty()),
  processingTime: v.pipe(v.number(), v.minValue(0)),
  audioFileName: v.pipe(v.string(), v.nonEmpty()),
  audioFileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  audioDuration: v.pipe(v.number(), v.minValue(0)),
  inputTextLength: v.pipe(v.number(), v.integer(), v.minValue(0)),
  totalCost: v.optional(v.pipe(v.number(), v.minValue(0))),
  actualCostUsd: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  ttsS3Url: v.optional(v.string(), undefined)
})

const LLMEstimationHeuristicsSchema = v.object({
  defaultInputMinutes: v.optional(v.pipe(v.number(), v.minValue(0))),
  inputTokensPerMinute: v.optional(v.pipe(v.number(), v.minValue(0))),
  outputTokensPerPrompt: v.optional(v.pipe(v.number(), v.minValue(0))),
  documentInputTokensPerPage: v.optional(v.pipe(v.number(), v.minValue(0))),
  documentImageInputTokens: v.optional(v.pipe(v.number(), v.minValue(0))),
  documentDefaultTextInputTokens: v.optional(v.pipe(v.number(), v.minValue(0))),
  documentDefaultDocxInputTokens: v.optional(v.pipe(v.number(), v.minValue(0))),
  documentTextBytesPerToken: v.optional(v.pipe(v.number(), v.minValue(0)))
})

export const llmServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  models: v.pipe(v.array(v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
    description: v.string(),
    estimation: ModelEstimationSchema,
    speedProfile: SpeedProfileSchema,
    quality: v.string(),
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
    estimationHeuristics: v.optional(LLMEstimationHeuristicsSchema),
    limit: v.optional(v.object({
      context: v.number(),
      input: v.optional(v.number()),
      output: v.number()
    }))
  })), v.minLength(1))
})

const ttsModelSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  name: v.pipe(v.string(), v.nonEmpty()),
  description: v.string(),
  estimation: ModelEstimationSchema,
  speedProfile: SpeedProfileSchema,
  quality: v.string(),
  costPerMillionChars: v.optional(v.pipe(v.number(), v.minValue(0)))
})

const ttsVoiceSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  name: v.pipe(v.string(), v.nonEmpty()),
  description: v.string()
})

export const ttsServiceConfigSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  models: v.pipe(v.array(ttsModelSchema), v.minLength(1)),
  voices: v.pipe(v.array(ttsVoiceSchema), v.minLength(1))
})

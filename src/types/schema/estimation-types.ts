import * as v from 'valibot'

const PositiveNumberSchema = v.pipe(v.number(), v.minValue(0))
const PositiveIntegerSchema = v.pipe(v.number(), v.integer(), v.minValue(0))

const TranscriptionCostEstimationSchema = v.object({
  kind: v.literal('transcription'),
  billedMinutesMinimum: PositiveIntegerSchema,
  perInputMinuteUsd: PositiveNumberSchema
})

export const LLMCostEstimationSchema = v.object({
  kind: v.literal('llm'),
  defaultInputMinutes: PositiveNumberSchema,
  inputTokensPerMinute: PositiveNumberSchema,
  outputTokensPerPrompt: PositiveNumberSchema,
  documentInputTokensPerPage: v.optional(PositiveNumberSchema),
  documentImageInputTokens: v.optional(PositiveNumberSchema),
  documentDefaultTextInputTokens: v.optional(PositiveNumberSchema),
  documentDefaultDocxInputTokens: v.optional(PositiveNumberSchema),
  documentTextBytesPerToken: v.optional(PositiveNumberSchema),
  inputUsdPerMillionTokens: PositiveNumberSchema,
  outputUsdPerMillionTokens: PositiveNumberSchema
})

const DocumentOcrCostEstimationSchema = v.object({
  kind: v.literal('document-ocr'),
  defaultPages: PositiveIntegerSchema,
  perPageUsd: PositiveNumberSchema
})

export const DocumentLlmCostEstimationSchema = v.object({
  kind: v.literal('document-llm'),
  defaultPages: PositiveIntegerSchema,
  textBytesPerToken: PositiveNumberSchema,
  pdfInputTokensPerPage: PositiveNumberSchema,
  imageInputTokensPerImage: PositiveNumberSchema,
  defaultTextInputTokens: PositiveNumberSchema,
  defaultDocxInputTokens: PositiveNumberSchema,
  outputToInputRatio: PositiveNumberSchema,
  inputUsdPerMillionTokens: PositiveNumberSchema,
  outputUsdPerMillionTokens: PositiveNumberSchema
})

const TTSCostEstimationSchema = v.object({
  kind: v.literal('tts'),
  defaultCharacters: PositiveIntegerSchema,
  usdPerCharacter: PositiveNumberSchema
})

export const ImageCostEstimationSchema = v.object({
  kind: v.literal('image'),
  defaultVariant: v.pipe(v.string(), v.nonEmpty()),
  usdPerPrompt: PositiveNumberSchema,
  usdPerPromptByVariant: v.record(v.pipe(v.string(), v.nonEmpty()), PositiveNumberSchema)
})

const MusicCostEstimationSchema = v.object({
  kind: v.literal('music'),
  perOutputSecondUsd: PositiveNumberSchema
})

const VideoCostEstimationSchema = v.object({
  kind: v.literal('video'),
  baseUsdPerPrompt: PositiveNumberSchema,
  perOutputSecondUsd: PositiveNumberSchema
})

const CostEstimationSchema = v.union([
  TranscriptionCostEstimationSchema,
  LLMCostEstimationSchema,
  DocumentOcrCostEstimationSchema,
  DocumentLlmCostEstimationSchema,
  TTSCostEstimationSchema,
  ImageCostEstimationSchema,
  MusicCostEstimationSchema,
  VideoCostEstimationSchema
])

const TranscriptionDurationEstimationSchema = v.object({
  kind: v.literal('transcription'),
  baseMs: PositiveNumberSchema,
  perInputMinuteMs: PositiveNumberSchema
})

export const LLMDurationEstimationSchema = v.object({
  kind: v.literal('llm'),
  defaultInputMinutes: PositiveNumberSchema,
  fixedOverheadMs: PositiveNumberSchema,
  inputTokensPerMinute: PositiveNumberSchema,
  outputTokensPerPrompt: PositiveNumberSchema,
  documentInputTokensPerPage: v.optional(PositiveNumberSchema),
  documentImageInputTokens: v.optional(PositiveNumberSchema),
  documentDefaultTextInputTokens: v.optional(PositiveNumberSchema),
  documentDefaultDocxInputTokens: v.optional(PositiveNumberSchema),
  documentTextBytesPerToken: v.optional(PositiveNumberSchema),
  perInputTokenMs: PositiveNumberSchema,
  perOutputTokenMs: PositiveNumberSchema
})

const DocumentOcrDurationEstimationSchema = v.object({
  kind: v.literal('document-ocr'),
  defaultPages: PositiveIntegerSchema,
  baseMs: PositiveNumberSchema,
  perPageMs: PositiveNumberSchema
})

export const DocumentLlmDurationEstimationSchema = v.object({
  kind: v.literal('document-llm'),
  defaultPages: PositiveIntegerSchema,
  fixedOverheadMs: PositiveNumberSchema,
  textBytesPerToken: PositiveNumberSchema,
  pdfInputTokensPerPage: PositiveNumberSchema,
  imageInputTokensPerImage: PositiveNumberSchema,
  defaultTextInputTokens: PositiveNumberSchema,
  defaultDocxInputTokens: PositiveNumberSchema,
  outputToInputRatio: PositiveNumberSchema,
  perInputTokenMs: PositiveNumberSchema,
  perOutputTokenMs: PositiveNumberSchema
})

const TTSDurationEstimationSchema = v.object({
  kind: v.literal('tts'),
  defaultCharacters: PositiveIntegerSchema,
  fixedOverheadMs: PositiveNumberSchema,
  perCharacterMs: PositiveNumberSchema
})

export const ImageDurationEstimationSchema = v.object({
  kind: v.literal('image'),
  defaultVariant: v.pipe(v.string(), v.nonEmpty()),
  msPerPrompt: PositiveNumberSchema,
  msPerPromptByVariant: v.record(v.pipe(v.string(), v.nonEmpty()), PositiveNumberSchema)
})

const MusicDurationEstimationSchema = v.object({
  kind: v.literal('music'),
  baseMs: PositiveNumberSchema,
  perOutputSecondMs: PositiveNumberSchema
})

const VideoDurationEstimationSchema = v.object({
  kind: v.literal('video'),
  baseMsPerPrompt: PositiveNumberSchema,
  perOutputSecondMs: PositiveNumberSchema
})

const DurationEstimationSchema = v.union([
  TranscriptionDurationEstimationSchema,
  LLMDurationEstimationSchema,
  DocumentOcrDurationEstimationSchema,
  DocumentLlmDurationEstimationSchema,
  TTSDurationEstimationSchema,
  ImageDurationEstimationSchema,
  MusicDurationEstimationSchema,
  VideoDurationEstimationSchema
])

export const ModelEstimationSchema = v.object({
  cost: CostEstimationSchema,
  duration: DurationEstimationSchema
})

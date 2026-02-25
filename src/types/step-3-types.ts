import * as v from 'valibot'

export type PromptRenderType = 'text' | 'stringList' | 'numberedList' | 'faq' | 'chapters'

export type PromptConfig = {
  title: string
  displayTitle: string
  category: 'Overviews' | 'Summaries' | 'Chapters' | 'Social Media Posts' | 'Creative Writing' | 'Marketing Content' | 'Educational' | 'Learning Resources' | 'Business Analysis' | 'Personal Growth'
  renderType: PromptRenderType
  schema: {
    type: 'string' | 'array'
    items?: Record<string, unknown>
    description: string
  }
  llmInstruction: string
  markdownInstruction: string
  markdownExample: string
}

export type ImagePromptType = 'keyMoment' | 'thumbnail' | 'conceptual' | 'infographic' | 'character' | 'quote'

export type ImagePromptConfig = {
  title: string
  description: string
  template: string
}

export const ChapterSchema = v.object({
  timestamp: v.string(),
  title: v.pipe(v.string(), v.nonEmpty()),
  description: v.string()
})

export const LLMResponseSchema = v.object({
  episodeDescription: v.string(),
  episodeSummary: v.string(),
  chapters: v.array(ChapterSchema)
})

export const Step3MetadataSchema = v.object({
  selectedPrompts: v.pipe(v.array(v.pipe(v.string(), v.nonEmpty())), v.minLength(1))
})

export type Step3Metadata = v.InferOutput<typeof Step3MetadataSchema>

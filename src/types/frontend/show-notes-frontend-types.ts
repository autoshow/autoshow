import type { JSX } from 'solid-js'
import type * as v from 'valibot'
import type { FAQItemSchema,StructuredChapterSchema } from '../schema/step-3-types'

export type PromptRenderType = 'text' | 'stringList' | 'numberedList' | 'faq' | 'chapters'

export type MetadataItemConfig = {
  label: string
  value: JSX.Element | string
  when?: boolean
}

export type StepConfig = {
  title: string
  enabled?: boolean | number | null | undefined
  items: MetadataItemConfig[]
  when?: boolean
}

export type StructuredChapter = v.InferOutput<typeof StructuredChapterSchema>
export type FAQItem = v.InferOutput<typeof FAQItemSchema>

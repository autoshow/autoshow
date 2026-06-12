import type { PromptRenderType,PromptType,StructuredLLMResponse } from '~/types'
export type SourceRoutesShowNotesTextOutputPromptOutputBlockProps = {
  textOutput: StructuredLLMResponse
  promptKey: PromptType
  displayTitle: string
  renderType: PromptRenderType
  markdownHtml?: string | null
}

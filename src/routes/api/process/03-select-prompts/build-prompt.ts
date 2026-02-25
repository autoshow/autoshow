import type { PromptType, PromptConfig } from '~/types'
import { PROMPT_CONFIG } from '~/prompts/text-prompts/text-prompt-config'

const STRUCTURED_SYSTEM_PROMPT = `You are a content analyst that extracts structured information from transcripts.

Guidelines:
- Do not use the word "delve"
- Do not include advertisements or sponsor segments
- Timestamps must be in exact HH:MM:SS format (two digits each)
- Ensure all content is accurate to the transcript`

export const buildStructuredPrompt = (
  transcript: string,
  videoInfo: { title: string, url: string, author?: string, duration?: string },
  selectedPrompts: string[]
): string => {
  const parts = [STRUCTURED_SYSTEM_PROMPT, '']

  parts.push('Return one valid JSON object that matches the provided schema exactly.')
  parts.push('Use the field guidance below. Treat examples as style references only.')
  parts.push('Do not include markdown code fences or text outside the JSON object.')
  parts.push('When a field schema type is array or object, return typed JSON values, not markdown-rendered lists.')
  parts.push('')
  parts.push('Generate a JSON object with the following fields:')
  parts.push('')

  for (const prompt of selectedPrompts) {
    parts.push(`- "${prompt}"`)
  }

  parts.push('')
  parts.push('<field_guidance>')

  for (const prompt of selectedPrompts) {
    if (prompt === 'text') {
      parts.push('<field name="text">')
      parts.push('<instruction>Generate a "text" field containing your complete response.</instruction>')
      parts.push('<formatting>Provide plain text content as the value for the "text" field.</formatting>')
      parts.push('<example>Complete response text generated from the transcript.</example>')
      parts.push('</field>')
      continue
    }

    const config = PROMPT_CONFIG[prompt as PromptType]
    if (config) {
      parts.push(...buildPromptGuidance(prompt, config))
    }
  }

  parts.push('</field_guidance>')
  parts.push('')
  parts.push(`Video Title: ${videoInfo.title}`)
  parts.push(`Video URL: ${videoInfo.url}`)

  if (videoInfo.author) parts.push(`Author: ${videoInfo.author}`)
  if (videoInfo.duration) parts.push(`Duration: ${videoInfo.duration}`)

  parts.push('', 'Transcript:', transcript)

  return parts.join('\n')
}

const buildPromptGuidance = (prompt: string, config: PromptConfig): string[] => {
  const formatting = config.markdownInstruction.trim()
  const example = config.markdownExample.trim()

  return [
    `<field name="${prompt}">`,
    `<instruction>${config.llmInstruction}</instruction>`,
    '<formatting>',
    formatting,
    '</formatting>',
    '<example>',
    example,
    '</example>',
    '</field>'
  ]
}

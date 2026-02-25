import type { PromptType } from '~/types'
import { PROMPT_CONFIG } from '~/prompts/text-prompts/text-prompt-config'

export const createDynamicSchema = (selectedPrompts: string[]): Record<string, unknown> => {
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  const addedKeys = new Set<string>()

  for (const prompt of selectedPrompts) {
    if (addedKeys.has(prompt)) continue

    if (prompt === 'text') {
      properties['text'] = { type: 'string', description: 'The generated text content' }
      required.push('text')
      addedKeys.add('text')
      continue
    }

    const config = PROMPT_CONFIG[prompt as PromptType]
    if (config) {
      const schema: Record<string, unknown> = {
        type: config.schema.type,
        description: config.schema.description
      }
      if (config.schema.items) {
        schema['items'] = config.schema.items
      }
      properties[prompt] = schema
      required.push(prompt)
      addedKeys.add(prompt)
    }
  }

  if (required.length === 0) {
    const defaultConfig = PROMPT_CONFIG['shortSummary']
    properties['shortSummary'] = {
      type: defaultConfig.schema.type,
      description: defaultConfig.schema.description
    }
    required.push('shortSummary')
  }

  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false
  }
}

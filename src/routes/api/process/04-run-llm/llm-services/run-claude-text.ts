import Anthropic from '@anthropic-ai/sdk'
import type { StructuredLLMResponse, Step4Metadata, IProgressTracker } from '~/types'
import { createDynamicSchema } from '~/routes/api/process/03-select-prompts/create-schema'
import { l } from '~/utils/logging'
import { requireEnvKey, stripMarkdownFences, buildLLMMetadata, logLLMCompletion, handleLLMError } from './llm-helpers'

export const runClaudeStructured = async (
  prompt: string,
  model: string,
  selectedPrompts: string[],
  progressTracker?: IProgressTracker,
  stepNumber: number = 4
): Promise<{ response: StructuredLLMResponse, metadata: Step4Metadata }> => {
  const apiKey = requireEnvKey('ANTHROPIC_API_KEY')
  const client = new Anthropic({ apiKey })
  const jsonSchema = createDynamicSchema(selectedPrompts)
  const startTime = Date.now()

  progressTracker?.updateStepProgress(stepNumber, 30, `Calling Claude ${model}...`)
  l(`Running Claude structured output`, { model, prompts: selectedPrompts })

  const systemPrompt = `You are a JSON generator. You MUST respond with valid JSON only, no other text.
The JSON must conform to this schema:
${JSON.stringify(jsonSchema, null, 2)}

Respond with ONLY the JSON object, no markdown code blocks, no explanation.`

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 16384,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    })

    const textBlock = response.content.find(block => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content in Claude response')
    }

    const jsonText = stripMarkdownFences(textBlock.text)
    const parsed = JSON.parse(jsonText) as StructuredLLMResponse
    const metadata = buildLLMMetadata(
      'claude',
      model,
      startTime,
      response.usage?.input_tokens ?? 0,
      response.usage?.output_tokens ?? 0
    )

    logLLMCompletion('Claude', metadata, progressTracker, stepNumber)
    return { response: parsed, metadata }
  } catch (error) {
    return handleLLMError(error, 'Claude', progressTracker, stepNumber)
  }
}

import Anthropic from '@anthropic-ai/sdk'
import { err } from '~/utils/logging'
import type { Step4Metadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'

const ANTHROPIC_API_KEY = process.env['ANTHROPIC_API_KEY']

const countTokens = (text: string): number => {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

export const runAnthropicModel = async (
  prompt: string,
  model: string,
  progressTracker?: IProgressTracker
): Promise<{ response: string, metadata: Step4Metadata }> => {
  try {
    if (!ANTHROPIC_API_KEY) {
      err(`ANTHROPIC_API_KEY not found in environment`)
      progressTracker?.error(4, 'Configuration error', 'ANTHROPIC_API_KEY environment variable is required')
      throw new Error('ANTHROPIC_API_KEY environment variable is required')
    }

    progressTracker?.updateStepProgress(4, 30, 'Waiting for Anthropic response')
    
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
    
    const inputTokenCount = countTokens(prompt)
    const startTime = Date.now()
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1800000)
    
    const response = await client.messages.create({
      model,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    }, {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    const processingTime = Date.now() - startTime
    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : ''
    
    if (!responseText) {
      progressTracker?.error(4, 'No response', 'No response text from Anthropic model')
      throw new Error('No response text from Anthropic model')
    }
    
    const outputTokenCount = countTokens(responseText)
    
    progressTracker?.updateStepProgress(4, 90, 'Processing response')
    
    const metadata: Step4Metadata = {
      llmService: 'anthropic',
      llmModel: model,
      processingTime,
      inputTokenCount,
      outputTokenCount
    }
    
    return { response: responseText, metadata }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      err(`Anthropic request timed out after 30 minutes`)
      progressTracker?.error(4, 'Timeout', 'Anthropic processing timed out after 30 minutes')
      throw new Error('Anthropic processing timed out after 30 minutes')
    }
    err(`Failed to run Anthropic model`, error)
    progressTracker?.error(4, 'LLM generation failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

export const checkAnthropicHealth = async (): Promise<boolean> => {
  try {
    if (!ANTHROPIC_API_KEY) {
      err(`ANTHROPIC_API_KEY not found in environment`)
      return false
    }
    return true
  } catch (error) {
    err(`Anthropic health check failed`, error)
    return false
  }
}

import OpenAI from 'openai'
import { err } from '~/utils/logging'
import type { Step4Metadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'

const OPENAI_API_KEY = process.env['OPENAI_API_KEY']

const countTokens = (text: string): number => {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

export const runOpenAIModel = async (
  prompt: string, 
  model: string,
  progressTracker?: IProgressTracker
): Promise<{ response: string, metadata: Step4Metadata }> => {
  try {
    if (!OPENAI_API_KEY) {
      err(`OPENAI_API_KEY not found in environment`)
      progressTracker?.error(4, 'Configuration error', 'OPENAI_API_KEY environment variable is required')
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    progressTracker?.updateStepProgress(4, 30, 'Waiting for OpenAI response')
    
    const client = new OpenAI({ apiKey: OPENAI_API_KEY })
    
    const inputTokenCount = countTokens(prompt)
    const startTime = Date.now()
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1800000)
    
    const response = await client.responses.create({
      model,
      input: prompt,
      stream: false
    }, {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.output_text) {
      progressTracker?.error(4, 'No response', 'No response text from OpenAI model')
      throw new Error('No response text from OpenAI model')
    }
    
    const processingTime = Date.now() - startTime
    const responseText = response.output_text
    const outputTokenCount = countTokens(responseText)
    
    progressTracker?.updateStepProgress(4, 90, 'Processing response')
    
    const metadata: Step4Metadata = {
      llmService: 'openai',
      llmModel: model,
      processingTime,
      inputTokenCount,
      outputTokenCount
    }
    
    return { response: responseText, metadata }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      err(`OpenAI request timed out after 30 minutes`)
      progressTracker?.error(4, 'Timeout', 'OpenAI processing timed out after 30 minutes')
      throw new Error('OpenAI processing timed out after 30 minutes')
    }
    err(`Failed to run OpenAI model`, error)
    progressTracker?.error(4, 'LLM generation failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

export const checkOpenAIHealth = async (): Promise<boolean> => {
  try {
    if (!OPENAI_API_KEY) {
      err(`OPENAI_API_KEY not found in environment`)
      return false
    }

    const client = new OpenAI({ apiKey: OPENAI_API_KEY })
    
    await client.models.list()
    return true
  } catch (error) {
    err(`OpenAI health check failed`, error)
    return false
  }
}
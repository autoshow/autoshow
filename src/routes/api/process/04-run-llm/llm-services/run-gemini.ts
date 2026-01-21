import { GoogleGenAI } from '@google/genai'
import { err } from '~/utils/logging'
import type { Step4Metadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'

const GEMINI_API_KEY = process.env['GEMINI_API_KEY']

const countTokens = (text: string): number => {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

export const runGeminiModel = async (
  prompt: string,
  model: string,
  progressTracker?: IProgressTracker
): Promise<{ response: string, metadata: Step4Metadata }> => {
  try {
    if (!GEMINI_API_KEY) {
      err(`GEMINI_API_KEY not found in environment`)
      progressTracker?.error(4, 'Configuration error', 'GEMINI_API_KEY environment variable is required')
      throw new Error('GEMINI_API_KEY environment variable is required')
    }

    progressTracker?.updateStepProgress(4, 30, 'Waiting for Gemini response')
    
    const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    
    const inputTokenCount = countTokens(prompt)
    const startTime = Date.now()
    
    const response = await genAI.models.generateContent({
      model,
      contents: prompt
    })
    
    const processingTime = Date.now() - startTime
    const responseText = response.text ?? ''
    
    if (!responseText) {
      progressTracker?.error(4, 'No response', 'No response text from Gemini model')
      throw new Error('No response text from Gemini model')
    }
    
    const outputTokenCount = countTokens(responseText)
    
    progressTracker?.updateStepProgress(4, 90, 'Processing response')
    
    const metadata: Step4Metadata = {
      llmService: 'gemini',
      llmModel: model,
      processingTime,
      inputTokenCount,
      outputTokenCount
    }
    
    return { response: responseText, metadata }
  } catch (error) {
    err(`Failed to run Gemini model`, error)
    progressTracker?.error(4, 'LLM generation failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

export const checkGeminiHealth = async (): Promise<boolean> => {
  try {
    if (!GEMINI_API_KEY) {
      err(`GEMINI_API_KEY not found in environment`)
      return false
    }
    return true
  } catch (error) {
    err(`Gemini health check failed`, error)
    return false
  }
}

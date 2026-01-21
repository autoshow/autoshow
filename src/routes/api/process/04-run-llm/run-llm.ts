import type { ProcessingOptions, VideoMetadata } from '~/types/main'
import type { TranscriptionResult } from '~/types/main'
import type { Step4Metadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { err } from '~/utils/logging'
import { runOpenAIModel } from './llm-services/run-chatgpt'
import { runAnthropicModel } from './llm-services/run-anthropic'
import { runGeminiModel } from './llm-services/run-gemini'
import { buildPrompt, buildPromptInstructions } from '../03-select-prompts/build-prompt'

export const writeFile = async (filePath: string, content: string): Promise<void> => {
  try {
    await Bun.write(filePath, content)
  } catch (error) {
    err(`Failed to write file: ${filePath}`, error)
    throw error
  }
}

export const runLLM = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker?: IProgressTracker
): Promise<{ metadata: Step4Metadata, promptInstructions: string }> => {
  if (!options.llmModel) {
    progressTracker?.error(4, 'Configuration error', 'No LLM model specified')
    throw new Error('No LLM model specified')
  }
  
  const service = options.llmService ?? 'openai'
  
  switch (service) {
    case 'anthropic':
      return await processWithAnthropic(metadata, transcription, options, progressTracker)
    case 'gemini':
      return await processWithGemini(metadata, transcription, options, progressTracker)
    case 'openai':
    default:
      return await processWithOpenAI(metadata, transcription, options, progressTracker)
  }
}

const processWithOpenAI = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker?: IProgressTracker
): Promise<{ metadata: Step4Metadata, promptInstructions: string }> => {
  progressTracker?.updateStepProgress(4, 10, 'Building prompt')
  
  const fullPrompt = buildPrompt(metadata, transcription, options.selectedPrompts)
  const promptInstructions = buildPromptInstructions(options.selectedPrompts)
  
  const promptPath = `${options.outputDir}/prompt.md`
  await writeFile(promptPath, fullPrompt)
  
  if (!options.llmModel) {
    progressTracker?.error(4, 'Configuration error', 'No OpenAI model specified')
    throw new Error('No OpenAI model specified')
  }
  
  progressTracker?.updateStepProgress(4, 20, 'Sending request to OpenAI')
  
  const { response, metadata: llmMetadata } = await runOpenAIModel(fullPrompt, options.llmModel, progressTracker)
  
  progressTracker?.updateStepProgress(4, 95, 'Saving response')
  
  const outputPath = `${options.outputDir}/summary.md`
  await writeFile(outputPath, response)
  
  progressTracker?.completeStep(4, 'LLM generation complete')
  
  return { metadata: llmMetadata, promptInstructions }
}

const processWithAnthropic = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker?: IProgressTracker
): Promise<{ metadata: Step4Metadata, promptInstructions: string }> => {
  progressTracker?.updateStepProgress(4, 10, 'Building prompt')
  
  const fullPrompt = buildPrompt(metadata, transcription, options.selectedPrompts)
  const promptInstructions = buildPromptInstructions(options.selectedPrompts)
  
  const promptPath = `${options.outputDir}/prompt.md`
  await writeFile(promptPath, fullPrompt)
  
  if (!options.llmModel) {
    progressTracker?.error(4, 'Configuration error', 'No Anthropic model specified')
    throw new Error('No Anthropic model specified')
  }
  
  progressTracker?.updateStepProgress(4, 20, 'Sending request to Anthropic')
  
  const { response, metadata: llmMetadata } = await runAnthropicModel(fullPrompt, options.llmModel, progressTracker)
  
  progressTracker?.updateStepProgress(4, 95, 'Saving response')
  
  const outputPath = `${options.outputDir}/summary.md`
  await writeFile(outputPath, response)
  
  progressTracker?.completeStep(4, 'LLM generation complete')
  
  return { metadata: llmMetadata, promptInstructions }
}

const processWithGemini = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker?: IProgressTracker
): Promise<{ metadata: Step4Metadata, promptInstructions: string }> => {
  progressTracker?.updateStepProgress(4, 10, 'Building prompt')
  
  const fullPrompt = buildPrompt(metadata, transcription, options.selectedPrompts)
  const promptInstructions = buildPromptInstructions(options.selectedPrompts)
  
  const promptPath = `${options.outputDir}/prompt.md`
  await writeFile(promptPath, fullPrompt)
  
  if (!options.llmModel) {
    progressTracker?.error(4, 'Configuration error', 'No Gemini model specified')
    throw new Error('No Gemini model specified')
  }
  
  progressTracker?.updateStepProgress(4, 20, 'Sending request to Gemini')
  
  const { response, metadata: llmMetadata } = await runGeminiModel(fullPrompt, options.llmModel, progressTracker)
  
  progressTracker?.updateStepProgress(4, 95, 'Saving response')
  
  const outputPath = `${options.outputDir}/summary.md`
  await writeFile(outputPath, response)
  
  progressTracker?.completeStep(4, 'LLM generation complete')
  
  return { metadata: llmMetadata, promptInstructions }
}
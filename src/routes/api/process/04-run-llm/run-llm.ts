import type { ProcessingOptions, VideoMetadata, TranscriptionResult, Step4Metadata, IProgressTracker, StructuredOutputProvider, LLMAttempt, StructuredLLMResponse } from '~/types'
import { l, err } from '~/utils/logging'
import { runOpenAIStructured } from './llm-services/run-openai-text'
import { runClaudeStructured } from './llm-services/run-claude-text'
import { runGeminiStructured } from './llm-services/run-gemini-text'
import { runMinimaxStructured } from './llm-services/run-minimax-text'
import { runGrokStructured } from './llm-services/run-grok-text'
import { runGroqStructured } from './llm-services/run-groq-text'
import { buildStructuredPrompt } from '~/routes/api/process/03-select-prompts/build-prompt'
import { LLM_CONFIG } from '~/models/llm-config'

const writeFile = async (filePath: string, content: string): Promise<void> => {
  try {
    await Bun.write(filePath, content)
  } catch (error) {
    err(`Failed to write file: ${filePath}`, error)
    throw error
  }
}

const runners = {
  openai: runOpenAIStructured,
  claude: runClaudeStructured,
  gemini: runGeminiStructured,
  minimax: runMinimaxStructured,
  grok: runGrokStructured,
  groq: runGroqStructured
} as const

const SERVICE_FALLBACK_ORDER: StructuredOutputProvider[] = ['gemini', 'openai', 'claude', 'minimax', 'grok', 'groq']

const getAlternateModelForService = (provider: StructuredOutputProvider, currentModel: string): string | null => {
  const config = LLM_CONFIG[provider]
  if (!config) return null
  const alternateModel = config.models.find(m => m.id !== currentModel)
  return alternateModel?.id ?? null
}

const getNextServiceWithModel = (
  currentProvider: StructuredOutputProvider,
  triedProviders: Set<StructuredOutputProvider>
): LLMAttempt | null => {
  for (const provider of SERVICE_FALLBACK_ORDER) {
    if (provider === currentProvider || triedProviders.has(provider)) continue
    const config = LLM_CONFIG[provider]
    if (config && config.models.length > 0) {
      return { provider, model: config.models[0]!.id }
    }
  }
  return null
}

const hasRequiredApiKey = (provider: StructuredOutputProvider): boolean => {
  const keyMap: Record<StructuredOutputProvider, string> = {
    openai: 'OPENAI_API_KEY',
    claude: 'ANTHROPIC_API_KEY',
    gemini: 'GEMINI_API_KEY',
    minimax: 'MINIMAX_API_KEY',
    grok: 'XAI_API_KEY',
    groq: 'GROQ_API_KEY'
  }
  return !!process.env[keyMap[provider]]
}

export const runStructuredLLM = async (
  provider: StructuredOutputProvider,
  prompt: string,
  model: string,
  selectedPrompts: string[],
  progressTracker?: IProgressTracker
): Promise<{ response: StructuredLLMResponse, metadata: Step4Metadata }> => {
  const runner = runners[provider]
  if (!runner) {
    throw new Error(`Unknown structured output provider: ${provider}`)
  }
  return runner(prompt, model, selectedPrompts, progressTracker)
}

const runStructuredLLMWithRetry = async (
  provider: StructuredOutputProvider,
  prompt: string,
  model: string,
  selectedPrompts: string[],
  progressTracker?: IProgressTracker
): Promise<{ response: StructuredLLMResponse, metadata: Step4Metadata }> => {
  const errors: Array<{ provider: string, model: string, error: string }> = []
  const triedProviders = new Set<StructuredOutputProvider>()

  let currentProvider = provider
  let currentModel = model
  let attemptNumber = 1

  while (attemptNumber <= 3) {
    if (!hasRequiredApiKey(currentProvider)) {
      l(`LLM retry: skipping ${currentProvider}, no API key configured`)
      triedProviders.add(currentProvider)
      const next = getNextServiceWithModel(currentProvider, triedProviders)
      if (!next) break
      currentProvider = next.provider
      currentModel = next.model
      continue
    }

    try {
      if (attemptNumber > 1) {
        l(`LLM retry attempt ${attemptNumber}`, { provider: currentProvider, model: currentModel })
        progressTracker?.updateStepProgress(4, 25, `Retry ${attemptNumber}: trying ${currentProvider}/${currentModel}`)
      }

      const result = await runStructuredLLM(
        currentProvider,
        prompt,
        currentModel,
        selectedPrompts,
        progressTracker
      )

      if (attemptNumber > 1) {
        l(`LLM retry succeeded`, {
          attempt: attemptNumber,
          provider: currentProvider,
          model: currentModel,
          previousErrors: errors.length
        })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ provider: currentProvider, model: currentModel, error: errorMessage })
      err(`LLM attempt ${attemptNumber} failed`, { provider: currentProvider, model: currentModel, error: errorMessage })

      if (attemptNumber === 1) {
        currentModel = model
        attemptNumber++
      } else if (attemptNumber === 2) {
        const alternateModel = getAlternateModelForService(currentProvider, currentModel)
        if (alternateModel) {
          currentModel = alternateModel
          attemptNumber++
        } else {
          triedProviders.add(currentProvider)
          const next = getNextServiceWithModel(currentProvider, triedProviders)
          if (next) {
            currentProvider = next.provider
            currentModel = next.model
            attemptNumber++
          } else {
            break
          }
        }
      } else {
        triedProviders.add(currentProvider)
        const next = getNextServiceWithModel(currentProvider, triedProviders)
        if (next) {
          currentProvider = next.provider
          currentModel = next.model
          attemptNumber++
        } else {
          break
        }
      }
    }
  }

  err(`All LLM attempts failed`, { errors })
  throw new Error(`All LLM attempts failed: ${errors.map(e => `${e.provider}/${e.model}: ${e.error}`).join('; ')}`)
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

  if (!options.llmService) {
    progressTracker?.error(4, 'Configuration error', 'No LLM service specified')
    throw new Error('No LLM service specified')
  }

  const service = options.llmService as StructuredOutputProvider

  l('Step 4: LLM Processing (Structured Output)', {
    service,
    model: options.llmModel,
    prompts: options.selectedPrompts
  })

  progressTracker?.updateStepProgress(4, 10, 'Building structured prompt')

  const fullPrompt = buildStructuredPrompt(
    transcription.text,
    { title: metadata.title, url: metadata.url, author: metadata.author, duration: metadata.duration },
    options.selectedPrompts
  )

  const promptPath = `${options.outputDir}/prompt.md`
  await writeFile(promptPath, fullPrompt)

  progressTracker?.updateStepProgress(4, 20, `Sending request to ${service}`)

  const { response, metadata: llmMetadata } = await runStructuredLLMWithRetry(
    service,
    fullPrompt,
    options.llmModel,
    options.selectedPrompts,
    progressTracker
  )

  progressTracker?.updateStepProgress(4, 95, 'Saving response')

  const jsonPath = `${options.outputDir}/text-output.json`
  await writeFile(jsonPath, JSON.stringify(response, null, 2))

  progressTracker?.completeStep(4, 'LLM generation complete')

  return { metadata: llmMetadata, promptInstructions: `Structured output: ${options.selectedPrompts.join(', ')}` }
}

export const processLLMGeneration = async (
  metadata: VideoMetadata,
  transcriptionResult: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker: IProgressTracker
) => {
  progressTracker.startStep(4, 'Starting LLM text generation')

  const result = await runLLM(metadata, transcriptionResult, options, progressTracker)

  return result
}

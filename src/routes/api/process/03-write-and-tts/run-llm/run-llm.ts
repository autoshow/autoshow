import { LLM_CONFIG } from '~/models/models-config/llm-config'
import { buildStructuredPrompt } from '~/routes/api/process/03-write-and-tts/select-prompts/build-prompt'
import { createRecoverableAttemptProgressTracker } from '~/routes/api/process/shared/recoverable-progress-tracker'
import type { IProgressTracker,LLMAttempt,ProcessingOptions,Step4Metadata,StructuredLLMResponse,StructuredOutputProvider,TranscriptionResult,VideoMetadata } from '~/types'
import { l } from '~/utils/logger/logging'
import { runClaudeStructured } from './llm-services/run-claude-text'
import { runDeepInfraStructured } from './llm-services/run-deepinfra-text'
import { runGeminiStructured } from './llm-services/run-gemini-text'
import { runGlmStructured } from './llm-services/run-glm-text'
import { runGrokStructured } from './llm-services/run-grok-text'
import { runGroqStructured } from './llm-services/run-groq-text'
import { runMinimaxStructured } from './llm-services/run-minimax-text'
import { runOpenAIStructured } from './llm-services/run-openai-text'

const writeFile = async (filePath: string, content: string): Promise<void> => {
  try {
    await Bun.write(filePath, content)
  } catch (error) {
    throw error
  }
}

const runners = {
  openai: runOpenAIStructured,
  claude: runClaudeStructured,
  gemini: runGeminiStructured,
  minimax: runMinimaxStructured,
  deepinfra: runDeepInfraStructured,
  grok: runGrokStructured,
  groq: runGroqStructured,
  glm: runGlmStructured
} as const

const SERVICE_FALLBACK_ORDER: StructuredOutputProvider[] = ['gemini', 'openai', 'claude', 'minimax', 'deepinfra', 'grok', 'groq', 'glm']

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
    deepinfra: 'DEEPINFRA_API_KEY',
    grok: 'XAI_API_KEY',
    groq: 'GROQ_API_KEY',
    glm: 'GLM_API_KEY'
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

const LLM_RETRY_TIMEOUT_MS = 5 * 60 * 1000

const runStructuredLLMWithRetry = async (
  provider: StructuredOutputProvider,
  prompt: string,
  model: string,
  selectedPrompts: string[],
  progressTracker?: IProgressTracker
): Promise<{ response: StructuredLLMResponse, metadata: Step4Metadata }> => {
  const errors: Array<{ provider: string, model: string, error: string }> = []
  const triedProviders = new Set<StructuredOutputProvider>()
  const startTime = Date.now()

  let currentProvider = provider
  let currentModel = model
  let providerAttemptNumber = 1

  while (true) {
    if (Date.now() - startTime > LLM_RETRY_TIMEOUT_MS) {
      throw new Error(`LLM retry timeout exceeded after ${Math.round((Date.now() - startTime) / 1000)}s: ${errors.map(e => `${e.provider}/${e.model}: ${e.error}`).join('; ')}`)
    }
    if (!hasRequiredApiKey(currentProvider)) {
      triedProviders.add(currentProvider)
      const next = getNextServiceWithModel(currentProvider, triedProviders)
      if (!next) break
      l('[llm-fallback] skipping provider (no API key)', { skipped: currentProvider, next: next.provider })
      currentProvider = next.provider
      currentModel = next.model
      providerAttemptNumber = 1
      continue
    }

    try {
      const overallAttemptNumber = errors.length + 1

      if (overallAttemptNumber > 1) {
        progressTracker?.updateStepProgress(4, 25, `Retry ${overallAttemptNumber}: trying ${currentProvider}/${currentModel}`)
      }

      const attemptProgressTracker = createRecoverableAttemptProgressTracker(progressTracker, {
        fallbackMessage: 'Trying another text generation provider'
      })
      const result = await runStructuredLLM(
        currentProvider,
        prompt,
        currentModel,
        selectedPrompts,
        attemptProgressTracker
      )

      if (overallAttemptNumber > 1) {
        l('[llm-fallback] succeeded after retries', { provider: currentProvider, model: currentModel, attempts: overallAttemptNumber })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ provider: currentProvider, model: currentModel, error: errorMessage })
      l('[llm-fallback] attempt failed', { provider: currentProvider, model: currentModel, attempt: providerAttemptNumber, error: errorMessage })

      if (providerAttemptNumber === 1) {
        providerAttemptNumber = 2
      } else if (providerAttemptNumber === 2) {
        const alternateModel = getAlternateModelForService(currentProvider, currentModel)
        if (alternateModel) {
          l('[llm-fallback] trying alternate model', { provider: currentProvider, from: currentModel, to: alternateModel })
          currentModel = alternateModel
          providerAttemptNumber = 3
        } else {
          triedProviders.add(currentProvider)
          const next = getNextServiceWithModel(currentProvider, triedProviders)
          if (next) {
            l('[llm-fallback] falling back to next provider', { from: currentProvider, to: next.provider })
            currentProvider = next.provider
            currentModel = next.model
            providerAttemptNumber = 1
          } else {
            break
          }
        }
      } else {
        triedProviders.add(currentProvider)
        const next = getNextServiceWithModel(currentProvider, triedProviders)
        if (next) {
          l('[llm-fallback] falling back to next provider', { from: currentProvider, to: next.provider })
          currentProvider = next.provider
          currentModel = next.model
          providerAttemptNumber = 1
        } else {
          break
        }
      }
    }
  }

  throw new Error(`All LLM attempts failed: ${errors.map(e => `${e.provider}/${e.model}: ${e.error}`).join('; ')}`)
}

const runLLM = async (
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

  progressTracker?.updateStepProgress(4, 10, 'Building structured prompt')

  const fullPrompt = buildStructuredPrompt(
    transcription.text,
    { title: metadata.title, url: metadata.url, author: metadata.author, duration: metadata.duration },
    options.selectedPrompts,
    options.llmCustomInstructions,
    transcription.segments
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

  return { metadata: llmMetadata, promptInstructions: fullPrompt }
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

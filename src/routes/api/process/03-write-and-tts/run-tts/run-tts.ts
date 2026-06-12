import { getDefaultTTSModel } from '~/models/models-config/tts-config'
import { createRecoverableAttemptProgressTracker } from '~/routes/api/process/shared/recoverable-progress-tracker'
import type { IProgressTracker,ProcessingOptions,Step5Metadata,StructuredLLMResponse,TTSServiceType } from '~/types'
import { l } from '~/utils/logger/logging'
import { runDeapiTTS } from './tts-services/run-deapi-tts'
import { runDeepgramTTS } from './tts-services/run-deepgram-tts'
import { runElevenLabsTTS } from './tts-services/run-elevenlabs-tts'
import { runGeminiTTS } from './tts-services/run-gemini-tts'
import { runGrokXTTS } from './tts-services/run-grok-tts'
import { runGroqTTS } from './tts-services/run-groq-tts'
import { runOpenAITTS } from './tts-services/run-openai-tts'
import { runRunwayTTS } from './tts-services/run-runway-tts'
import { STEP_NUMBER } from './tts-services/tts-helpers'

const runners: Record<TTSServiceType, typeof runOpenAITTS> = {
  openai: runOpenAITTS,
  elevenlabs: runElevenLabsTTS,
  deepgram: runDeepgramTTS,
  gemini: runGeminiTTS,
  grok: runGrokXTTS,
  groq: runGroqTTS,
  runway: runRunwayTTS,
  deapi: runDeapiTTS
}

const TTS_FALLBACK_ORDER: TTSServiceType[] = ['gemini', 'openai', 'groq', 'deepgram', 'elevenlabs', 'grok', 'runway', 'deapi']

const TTS_API_KEY_MAP: Record<TTSServiceType, string> = {
  openai: 'OPENAI_API_KEY',
  elevenlabs: 'ELEVENLABS_API_KEY',
  deepgram: 'DEEPGRAM_API_KEY',
  gemini: 'GEMINI_API_KEY',
  grok: 'XAI_API_KEY',
  groq: 'GROQ_API_KEY',
  runway: 'RUNWAYML_API_SECRET',
  deapi: 'DEAPI_API_KEY',
}

const DEFAULT_TTS_VOICE: Record<TTSServiceType, string> = {
  openai: 'coral',
  elevenlabs: 'JBFqnCBsd6RMkjVDRZzb',
  deepgram: 'aura-2-thalia-en',
  gemini: 'Aoede',
  grok: 'eve',
  groq: 'autumn',
  runway: 'Leslie',
  deapi: 'af_sky',
}

const hasRequiredTTSApiKey = (service: TTSServiceType): boolean => {
  return !!process.env[TTS_API_KEY_MAP[service]]
}

const getNextTTSService = (
  currentService: TTSServiceType,
  triedServices: Set<TTSServiceType>
): TTSServiceType | null => {
  for (const service of TTS_FALLBACK_ORDER) {
    if (service === currentService || triedServices.has(service)) continue
    if (hasRequiredTTSApiKey(service)) return service
  }
  return null
}

const TTS_RETRY_TIMEOUT_MS = 3 * 60 * 1000

const runTTS = async (
  text: string,
  outputDir: string,
  voice: string,
  model: string,
  progressTracker?: IProgressTracker,
  service: TTSServiceType = 'openai',
  instructions?: string,
  jobId?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {

  progressTracker?.updateStepProgress(STEP_NUMBER, 10, 'Starting text-to-speech generation')

  const runner = runners[service]
  if (!runner) {
    throw new Error(`Unknown TTS service: ${service}`)
  }

  const result = await runner(text, outputDir, voice, model, progressTracker, instructions, jobId)

  return result
}

const runTTSWithRetry = async (
  text: string,
  outputDir: string,
  voice: string,
  model: string,
  progressTracker?: IProgressTracker,
  service: TTSServiceType = 'openai',
  instructions?: string,
  jobId?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  const errors: Array<{ service: string, model: string, error: string }> = []
  const triedServices = new Set<TTSServiceType>()
  const startTime = Date.now()

  let currentService = service
  let currentModel = model
  let currentVoice = voice
  let attemptNumber = 1

  while (true) {
    if (Date.now() - startTime > TTS_RETRY_TIMEOUT_MS) {
      throw new Error(`TTS retry timeout exceeded after ${Math.round((Date.now() - startTime) / 1000)}s: ${errors.map(e => `${e.service}/${e.model}: ${e.error}`).join('; ')}`)
    }

    if (!hasRequiredTTSApiKey(currentService)) {
      triedServices.add(currentService)
      const next = getNextTTSService(currentService, triedServices)
      if (!next) break
      l('[tts-fallback] skipping service (no API key)', { skipped: currentService, next })
      currentService = next
      currentModel = getDefaultTTSModel(next)
      currentVoice = DEFAULT_TTS_VOICE[next]
      attemptNumber = 1
      continue
    }

    try {
      if (errors.length > 0) {
        progressTracker?.updateStepProgress(STEP_NUMBER, 10, `Retry ${errors.length + 1}: trying ${currentService}/${currentModel}`)
      }

      const attemptProgressTracker = createRecoverableAttemptProgressTracker(progressTracker, {
        fallbackMessage: 'Trying another text-to-speech provider'
      })
      const result = await runTTS(text, outputDir, currentVoice, currentModel, attemptProgressTracker, currentService, instructions, jobId)

      if (errors.length > 0) {
        l('[tts-fallback] succeeded after retries', { service: currentService, model: currentModel, attempts: errors.length + 1 })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ service: currentService, model: currentModel, error: errorMessage })
      l('[tts-fallback] attempt failed', { service: currentService, model: currentModel, attempt: attemptNumber, error: errorMessage })

      if (attemptNumber === 1) {
        attemptNumber = 2
      } else {
        triedServices.add(currentService)
        const next = getNextTTSService(currentService, triedServices)
        if (next) {
          l('[tts-fallback] falling back to next service', { from: currentService, to: next })
          currentService = next
          currentModel = getDefaultTTSModel(next)
          currentVoice = DEFAULT_TTS_VOICE[next]
          attemptNumber = 1
        } else {
          break
        }
      }
    }
  }

  throw new Error(`All TTS attempts failed: ${errors.map(e => `${e.service}/${e.model}: ${e.error}`).join('; ')}`)
}

export const processTTS = async (
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  jobId?: string
) => {

  if (!options.ttsEnabled) {
    return undefined
  }
  if (!options.ttsVoice || !options.ttsService || !options.ttsModel) {
    throw new Error('TTS service, model, and voice are required when TTS is enabled')
  }

  progressTracker.startStep(STEP_NUMBER, 'Starting text-to-speech generation')

  const textOutputPath = `${options.outputDir}/text-output.json`
  const textOutputJson = await Bun.file(textOutputPath).json() as StructuredLLMResponse
  const parts: string[] = []
  if (textOutputJson.text) parts.push(textOutputJson.text)
  if (textOutputJson.shortSummary) parts.push(textOutputJson.shortSummary)
  if (textOutputJson.longSummary) parts.push(textOutputJson.longSummary)
  if (textOutputJson.bulletPoints?.length) parts.push(textOutputJson.bulletPoints.join('\n'))
  if (textOutputJson.takeaways?.length) parts.push(textOutputJson.takeaways.join('\n'))
  if (textOutputJson.faq?.length) parts.push(textOutputJson.faq.map(f => `${f.question}\n${f.answer}`).join('\n\n'))
  const textOutputText = parts.join('\n\n')

  const ttsResult = await runTTSWithRetry(
    textOutputText,
    options.outputDir,
    options.ttsVoice,
    options.ttsModel,
    progressTracker,
    options.ttsService,
    undefined,
    jobId
  )

  return ttsResult.metadata
}

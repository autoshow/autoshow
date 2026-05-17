import { getDefaultTranscriptionModelForService,isValidTranscriptionModel } from '~/models/models-config/transcription-config'
import { createRecoverableAttemptProgressTracker } from '~/routes/api/process/shared/recoverable-progress-tracker'
import type { IProgressTracker,ProcessingOptions,Step2Metadata,TranscriptionResult,TranscriptionServiceType } from '~/types'
import { l } from '~/utils/logger/logging'
import { getAudioDuration,splitAudioFile } from './audio-splitter'
import { transcribeWithAssembly } from './transcription-services/assembly/run-assembly'
import { transcribeWithDeepgram } from './transcription-services/deepgram/run-deepgram'
import { transcribeWithDeepInfra } from './transcription-services/deepinfra/run-deepinfra-whisper'
import { transcribeWithGladia } from './transcription-services/gladia/run-gladia'
import { transcribeWithGroq } from './transcription-services/groq/run-groq-whisper'
import { transcribeWithSoniox } from './transcription-services/soniox/run-soniox'
import { formatTranscriptOutput } from './transcription-services/transcription-helpers'

const NON_DIARIZED_CHUNK_THRESHOLD_SECONDS = 10 * 60
const NON_DIARIZED_CHUNK_DURATION_MINUTES = 10
const LONG_AUDIO_FALLBACK_THRESHOLD_SECONDS = 30 * 60
const LONG_AUDIO_FALLBACK_CHUNK_DURATION_MINUTES = 30

export type TranscriptionChunkingReason = 'non-diarized-local-or-direct' | 'long-audio-fallback'

export type TranscriptionChunkingPolicy = {
  reason: TranscriptionChunkingReason
  segmentDurationMinutes: number
  thresholdSeconds: number
}

export const isWhisperService = (service: TranscriptionServiceType): boolean => {
  return service === 'groq' || service === 'deepinfra'
}

export const isDiarizationService = (service: TranscriptionServiceType): boolean => {
  return service === 'gladia' || service === 'assembly' || service === 'deepgram' || service === 'soniox'
}

const getTranscriber = (service: TranscriptionServiceType | undefined) => {
  switch (service) {
    case 'deepinfra':
      return transcribeWithDeepInfra
    case 'gladia':
      return transcribeWithGladia
    case 'assembly':
      return transcribeWithAssembly
    case 'deepgram':
      return transcribeWithDeepgram
    case 'soniox':
      return transcribeWithSoniox
    case 'groq':
      return transcribeWithGroq
    default:
      throw new Error(`Unsupported transcription service: ${service}`)
  }
}

const WHISPER_FALLBACK_ORDER: TranscriptionServiceType[] = ['groq', 'deepinfra']
const DIARIZATION_FALLBACK_ORDER: TranscriptionServiceType[] = ['deepgram', 'assembly', 'gladia', 'soniox']

const TRANSCRIPTION_API_KEY_MAP: Partial<Record<TranscriptionServiceType, string>> = {
  groq: 'GROQ_API_KEY',
  deepinfra: 'DEEPINFRA_API_KEY',
  gladia: 'GLADIA_API_KEY',
  assembly: 'ASSEMBLYAI_API_KEY',
  deepgram: 'DEEPGRAM_API_KEY',
  soniox: 'SONIOX_API_KEY',
}

const hasRequiredTranscriptionApiKey = (service: TranscriptionServiceType): boolean => {
  const key = TRANSCRIPTION_API_KEY_MAP[service]
  return key ? !!process.env[key] : false
}

export const isNonDiarizedChunkingSource = (options: ProcessingOptions): boolean => {
  return options.inputType === 'audio-video'
    && (options.isLocalFile === true || options.urlType === 'direct-file')
}

export const resolveTranscriptionChunkingPolicy = (
  options: ProcessingOptions,
  durationSeconds: number
): TranscriptionChunkingPolicy | null => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null
  }

  const service = options.transcriptionService

  if (
    isWhisperService(service)
    && isNonDiarizedChunkingSource(options)
    && durationSeconds > NON_DIARIZED_CHUNK_THRESHOLD_SECONDS
  ) {
    return {
      reason: 'non-diarized-local-or-direct',
      segmentDurationMinutes: NON_DIARIZED_CHUNK_DURATION_MINUTES,
      thresholdSeconds: NON_DIARIZED_CHUNK_THRESHOLD_SECONDS
    }
  }

  if (durationSeconds > LONG_AUDIO_FALLBACK_THRESHOLD_SECONDS) {
    return {
      reason: 'long-audio-fallback',
      segmentDurationMinutes: LONG_AUDIO_FALLBACK_CHUNK_DURATION_MINUTES,
      thresholdSeconds: LONG_AUDIO_FALLBACK_THRESHOLD_SECONDS
    }
  }

  return null
}

const getFallbackOrder = (service: TranscriptionServiceType): TranscriptionServiceType[] => {
  if (isWhisperService(service)) return WHISPER_FALLBACK_ORDER
  if (isDiarizationService(service)) return DIARIZATION_FALLBACK_ORDER
  return []
}

const getNextTranscriptionService = (
  currentService: TranscriptionServiceType,
  triedServices: Set<TranscriptionServiceType>
): TranscriptionServiceType | null => {
  const order = getFallbackOrder(currentService)
  for (const service of order) {
    if (service === currentService || triedServices.has(service)) continue
    if (hasRequiredTranscriptionApiKey(service)) return service
  }
  return null
}

const TRANSCRIPTION_RETRY_TIMEOUT_MS = 5 * 60 * 1000
type TranscriptionAttemptRunner = typeof transcribeWithService

const validateTranscriptionSelection = (
  service: TranscriptionServiceType | undefined,
  model: string | undefined
): void => {
  if (!service) {
    throw new Error('Transcription service is required')
  }

  if (!model) {
    throw new Error('Transcription model is required')
  }

  if (!isValidTranscriptionModel(service, model)) {
    throw new Error(`Invalid transcription model for service: ${service}`)
  }
}

const transcribeWithService = async (
  audioPath: string,
  options: ProcessingOptions,
  progressTracker?: IProgressTracker
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  validateTranscriptionSelection(options.transcriptionService, options.transcriptionModel)
  const whisperModel = options.transcriptionModel

  if (options.transcriptionService === 'happyscribe') {
    throw new Error('HappyScribe is only supported for streaming URLs')
  }

  if (options.transcriptionService === 'deapi') {
    throw new Error('deAPI is only supported for streaming URLs')
  }

  if (options.transcriptionService === 'supadata') {
    throw new Error('Supadata is only supported for streaming URLs')
  }

  if (options.transcriptionService === 'youtube') {
    throw new Error('YouTube Captions is only supported for YouTube URLs')
  }

  const transcriber = getTranscriber(options.transcriptionService)

  progressTracker?.updateStepProgress(2, 5, 'Checking audio duration')
  const duration = await getAudioDuration(audioPath)
  const chunkingPolicy = resolveTranscriptionChunkingPolicy(options, duration)

  if (chunkingPolicy) {
    const segmentDurationMinutes = chunkingPolicy.segmentDurationMinutes
    progressTracker?.updateStepProgress(
      2,
      10,
      `Audio exceeds ${chunkingPolicy.thresholdSeconds / 60} minutes - splitting into ${segmentDurationMinutes}-minute segments`
    )

    const segmentPaths = await splitAudioFile(audioPath, options.outputDir, segmentDurationMinutes)

    progressTracker?.updateStepProgress(2, 20, `Split into ${segmentPaths.length} segments`)

    const segmentResults: Array<{ result: TranscriptionResult, metadata: Step2Metadata }> = []

    for (let i = 0; i < segmentPaths.length; i++) {
      const segmentPath = segmentPaths[i]!
      const segmentNumber = i + 1
      const offsetMinutes = i * segmentDurationMinutes

      const baseProgress = 20 + ((i / segmentPaths.length) * 70)
      progressTracker?.updateStepWithSubStep(
        2,
        segmentNumber,
        segmentPaths.length,
        `Segment ${segmentNumber}/${segmentPaths.length}`,
        `Transcribing ${segmentDurationMinutes}-minute segment ${segmentNumber} of ${segmentPaths.length}`
      )

      const segmentData = await transcriber(
        segmentPath,
        options.outputDir,
        offsetMinutes,
        segmentNumber,
        segmentPaths.length,
        whisperModel,
        progressTracker,
        baseProgress
      )

      segmentResults.push(segmentData)
    }

    progressTracker?.updateStepProgress(2, 95, 'Combining transcription segments')

    const combinedResult = combineTranscriptionResults(segmentResults.map(s => s.result))

    const finalTranscriptPath = `${options.outputDir}/transcription.txt`
    await Bun.write(finalTranscriptPath, formatTranscriptOutput(combinedResult.segments))

    const totalProcessingTime = segmentResults.reduce((sum, s) => sum + s.metadata.processingTime, 0)
    const totalTokenCount = segmentResults.reduce((sum, s) => sum + s.metadata.tokenCount, 0)
    const segmentCosts = segmentResults.map(s => s.metadata.totalCost).filter((c): c is number => c != null)
    const totalCost = segmentCosts.length > 0 ? segmentCosts.reduce((sum, c) => sum + c, 0) : undefined
    const segmentActualCosts = segmentResults.map(s => s.metadata.actualCostUsd).filter((c): c is number => c != null)
    const totalActualCostUsd = segmentActualCosts.length > 0 ? segmentActualCosts.reduce((sum, c) => sum + c, 0) : undefined

    const combinedMetadata: Step2Metadata = {
      transcriptionService: segmentResults[0]!.metadata.transcriptionService,
      transcriptionModel: segmentResults[0]!.metadata.transcriptionModel,
      processingTime: totalProcessingTime,
      tokenCount: totalTokenCount,
      totalCost,
      actualCostUsd: totalActualCostUsd
    }

    progressTracker?.completeStep(2, 'Transcription complete')

    return { result: combinedResult, metadata: combinedMetadata }
  }

  progressTracker?.updateStepProgress(2, 15, 'Starting single-file transcription')

  return await transcriber(audioPath, options.outputDir, 0, undefined, undefined, whisperModel, progressTracker)
}

const combineTranscriptionResults = (results: TranscriptionResult[]): TranscriptionResult => {
  const combinedSegments = results.flatMap(result => result.segments)
  const combinedText = results.map(result => result.text).join(' ')

  return {
    text: combinedText,
    segments: combinedSegments
  }
}

export const runTranscriptionWithRetry = async (
  audioPath: string,
  options: ProcessingOptions,
  progressTracker?: IProgressTracker,
  runAttempt: TranscriptionAttemptRunner = transcribeWithService
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  validateTranscriptionSelection(options.transcriptionService, options.transcriptionModel)

  const fallbackOrder = getFallbackOrder(options.transcriptionService)

  if (fallbackOrder.length === 0) {
    return runAttempt(audioPath, options, progressTracker)
  }

  const errors: Array<{ service: string, model: string, error: string }> = []
  const triedServices = new Set<TranscriptionServiceType>()
  const startTime = Date.now()

  let currentService: TranscriptionServiceType = options.transcriptionService
  let currentModel = options.transcriptionModel
  let attemptNumber = 1

  while (true) {
    if (Date.now() - startTime > TRANSCRIPTION_RETRY_TIMEOUT_MS) {
      throw new Error(`Transcription retry timeout exceeded after ${Math.round((Date.now() - startTime) / 1000)}s: ${errors.map(e => `${e.service}/${e.model}: ${e.error}`).join('; ')}`)
    }

    if (!hasRequiredTranscriptionApiKey(currentService)) {
      triedServices.add(currentService)
      const next = getNextTranscriptionService(currentService, triedServices)
      if (!next) break
      l('[transcription-fallback] skipping service (no API key)', { skipped: currentService, next })
      currentService = next
      currentModel = getDefaultTranscriptionModelForService(next)
      attemptNumber = 1
      continue
    }

    try {
      if (errors.length > 0) {
        progressTracker?.updateStepProgress(2, 5, `Retry ${errors.length + 1}: trying ${currentService}/${currentModel}`)
      }

      const attemptProgressTracker = createRecoverableAttemptProgressTracker(progressTracker, {
        fallbackMessage: 'Trying another transcription provider'
      })
      const result = await runAttempt(audioPath, {
        ...options,
        transcriptionService: currentService,
        transcriptionModel: currentModel,
      }, attemptProgressTracker)

      if (errors.length > 0) {
        l('[transcription-fallback] succeeded after retries', { service: currentService, model: currentModel, attempts: errors.length + 1 })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ service: currentService, model: currentModel, error: errorMessage })
      l('[transcription-fallback] attempt failed', { service: currentService, model: currentModel, attempt: attemptNumber, error: errorMessage })

      if (attemptNumber === 1) {
        attemptNumber = 2
      } else {
        triedServices.add(currentService)
        const next = getNextTranscriptionService(currentService, triedServices)
        if (next) {
          l('[transcription-fallback] falling back to next service', { from: currentService, to: next })
          currentService = next
          currentModel = getDefaultTranscriptionModelForService(next)
          attemptNumber = 1
        } else {
          break
        }
      }
    }
  }

  throw new Error(`All transcription attempts failed: ${errors.map(e => `${e.service}/${e.model}: ${e.error}`).join('; ')}`)
}

export const transcribe = async (
  audioPath: string,
  options: ProcessingOptions,
  progressTracker?: IProgressTracker
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  return runTranscriptionWithRetry(audioPath, options, progressTracker)
}

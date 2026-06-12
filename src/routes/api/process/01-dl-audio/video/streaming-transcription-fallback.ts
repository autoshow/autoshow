import { getDefaultTranscriptionModelForService } from '~/models/models-config/transcription-config'
import { createRecoverableAttemptProgressTracker } from '~/routes/api/process/shared/recoverable-progress-tracker'
import { transcribeWithDeapi } from '~/routes/api/process/02-run-transcribe/transcription-services/deapi/run-deapi'
import { transcribeStreamingWithGladia } from '~/routes/api/process/02-run-transcribe/transcription-services/gladia/run-gladia-streaming'
import { transcribeWithHappyScribe } from '~/routes/api/process/02-run-transcribe/transcription-services/happyscribe/run-happyscribe'
import { transcribeWithSupadata } from '~/routes/api/process/02-run-transcribe/transcription-services/supadata/run-supadata'
import { transcribeWithYouTubeCaptions } from '~/routes/api/process/02-run-transcribe/transcription-services/youtube/run-youtube-captions'
import type { IProgressTracker,ProcessingOptions,Step2Metadata,TranscriptionResult,TranscriptionServiceType,VideoMetadata } from '~/types'
import { l } from '~/utils/logger/logging'
import { isApprovedStreamingHost } from '~/utils/remote-source-url'

export type StreamingTranscriptionService = Extract<TranscriptionServiceType, 'youtube' | 'happyscribe' | 'gladia' | 'deapi' | 'supadata'>

type StreamingTranscriptionResult = {
  result: TranscriptionResult
  metadata: Step2Metadata
}

export type StreamingTranscriptionAttempt = {
  service: StreamingTranscriptionService
  model: string
}

export type StreamingTranscriptionAttemptRunner = (
  attempt: StreamingTranscriptionAttempt,
  url: string,
  metadata: VideoMetadata,
  options: ProcessingOptions,
  progressTracker: IProgressTracker
) => Promise<StreamingTranscriptionResult>

const PAID_STREAMING_FALLBACK_ORDER: StreamingTranscriptionService[] = ['happyscribe', 'gladia', 'deapi', 'supadata']

const STREAMING_PROVIDER_LABELS: Record<StreamingTranscriptionService, string> = {
  youtube: 'YouTube caption import',
  happyscribe: 'HappyScribe transcription',
  gladia: 'Gladia transcription',
  deapi: 'deAPI transcription',
  supadata: 'Supadata transcription'
}

const STREAMING_ENV_REQUIREMENTS: Partial<Record<StreamingTranscriptionService, string[]>> = {
  happyscribe: ['HAPPYSCRIBE_API_KEY', 'HAPPYSCRIBE_ORGANIZATION_ID'],
  gladia: ['GLADIA_API_KEY'],
  deapi: ['DEAPI_API_KEY'],
  supadata: ['SUPADATA_API_KEY']
}

const STREAMING_TRANSCRIPTION_RUNNERS: Record<StreamingTranscriptionService, StreamingTranscriptionAttemptRunner> = {
  youtube: (attempt, url, metadata, options, progressTracker) => transcribeWithYouTubeCaptions(
    url,
    metadata,
    options,
    progressTracker,
    attempt.model
  ),
  happyscribe: (attempt, url, metadata, options, progressTracker) => transcribeWithHappyScribe(
    url,
    metadata,
    options,
    progressTracker,
    attempt.model
  ),
  gladia: (attempt, url, metadata, options, progressTracker) => transcribeStreamingWithGladia(
    url,
    metadata,
    options,
    progressTracker,
    attempt.model
  ),
  deapi: (attempt, url, metadata, options, progressTracker) => transcribeWithDeapi(
    url,
    metadata,
    options,
    progressTracker,
    attempt.model
  ),
  supadata: (attempt, url, metadata, options, progressTracker) => transcribeWithSupadata(
    url,
    metadata,
    options,
    progressTracker,
    attempt.model
  )
}

const runDefaultStreamingTranscriptionAttempt: StreamingTranscriptionAttemptRunner = (
  attempt,
  url,
  metadata,
  options,
  progressTracker
) => {
  return STREAMING_TRANSCRIPTION_RUNNERS[attempt.service](
    attempt,
    url,
    metadata,
    options,
    progressTracker
  )
}

const isStreamingTranscriptionService = (
  service: TranscriptionServiceType
): service is StreamingTranscriptionService => {
  return service === 'youtube'
    || service === 'happyscribe'
    || service === 'gladia'
    || service === 'deapi'
    || service === 'supadata'
}

const getMissingEnvVars = (service: StreamingTranscriptionService): string[] => {
  return (STREAMING_ENV_REQUIREMENTS[service] ?? []).filter(key => !process.env[key])
}

const addAttempt = (
  attempts: StreamingTranscriptionAttempt[],
  triedServices: Set<StreamingTranscriptionService>,
  service: StreamingTranscriptionService,
  model: string
): void => {
  if (triedServices.has(service)) return

  triedServices.add(service)
  attempts.push({ service, model })
}

export const buildStreamingTranscriptionFallbackChain = (
  options: ProcessingOptions
): StreamingTranscriptionAttempt[] => {
  const selectedService = options.transcriptionService
  if (!isStreamingTranscriptionService(selectedService)) {
    return []
  }

  const attempts: StreamingTranscriptionAttempt[] = []
  const triedServices = new Set<StreamingTranscriptionService>()

  addAttempt(attempts, triedServices, selectedService, options.transcriptionModel)

  if (selectedService !== 'youtube' && isApprovedStreamingHost(options.url, 'youtube')) {
    addAttempt(attempts, triedServices, 'youtube', getDefaultTranscriptionModelForService('youtube'))
  }

  for (const service of PAID_STREAMING_FALLBACK_ORDER) {
    addAttempt(attempts, triedServices, service, getDefaultTranscriptionModelForService(service))
  }

  return attempts
}

const formatAttemptErrors = (errors: Array<{ service: string, model: string, error: string }>): string => {
  return errors.map(e => `${e.service}/${e.model}: ${e.error}`).join('; ')
}

export const runStreamingTranscriptionWithFallback = async (
  url: string,
  metadata: VideoMetadata,
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  runAttempt: StreamingTranscriptionAttemptRunner = runDefaultStreamingTranscriptionAttempt
): Promise<StreamingTranscriptionResult> => {
  const attempts = buildStreamingTranscriptionFallbackChain(options)

  if (attempts.length === 0) {
    progressTracker.error(2, 'Invalid transcription service', 'Please use YouTube Captions, HappyScribe, Gladia, deAPI, or Supadata for streaming URLs')
    throw new Error('Invalid transcription service for video URL. Please use YouTube Captions, HappyScribe, Gladia, deAPI, or Supadata for streaming URLs.')
  }

  const errors: Array<{ service: string, model: string, error: string }> = []
  const skippedServices: Array<{ service: string, missingEnvVars: string[] }> = []

  for (const attempt of attempts) {
    const missingEnvVars = getMissingEnvVars(attempt.service)
    if (missingEnvVars.length > 0) {
      skippedServices.push({ service: attempt.service, missingEnvVars })
      l('[streaming-transcription-fallback] skipping service (missing configuration)', {
        service: attempt.service,
        missingEnvVars
      })
      continue
    }

    const attemptProgressTracker = createRecoverableAttemptProgressTracker(progressTracker, {
      fallbackMessage: 'Trying another streaming transcription provider'
    }) ?? progressTracker

    attemptProgressTracker.startStep(2, `Starting ${STREAMING_PROVIDER_LABELS[attempt.service]}`)
    if (errors.length > 0 || skippedServices.length > 0) {
      attemptProgressTracker.updateStepProgress(2, 5, `Trying ${attempt.service}/${attempt.model}`)
    }

    try {
      const result = await runAttempt(
        attempt,
        url,
        metadata,
        {
          ...options,
          transcriptionService: attempt.service,
          transcriptionModel: attempt.model
        },
        attemptProgressTracker
      )

      if (errors.length > 0 || skippedServices.length > 0) {
        l('[streaming-transcription-fallback] succeeded after fallback', {
          service: attempt.service,
          model: attempt.model,
          failedAttempts: errors.length,
          skippedServices: skippedServices.map(skipped => skipped.service)
        })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ service: attempt.service, model: attempt.model, error: errorMessage })
      l('[streaming-transcription-fallback] attempt failed', {
        service: attempt.service,
        model: attempt.model,
        error: errorMessage
      })
    }
  }

  const skippedMessage = skippedServices
    .map(skipped => `${skipped.service}: missing ${skipped.missingEnvVars.join(', ')}`)
    .join('; ')
  const failedMessage = formatAttemptErrors(errors)
  const details = [failedMessage, skippedMessage].filter(Boolean).join('; ')

  throw new Error(`All streaming transcription attempts failed: ${details || 'no configured providers available'}`)
}

import { l, err } from '~/utils/logging'
import { countTokens } from '~/utils/audio'
import type { TranscriptionResult, Step2Metadata, IProgressTracker } from '~/types'
import { RevJobResponseSchema, RevTranscriptResponseSchema, validateOrThrow } from '~/types'
import { parseRevOutput } from './parse-rev-output'
import { formatTranscriptOutput } from '../transcription-helpers'

const REV_API_BASE = 'https://api.rev.ai/speechtotext/v1'
const REV_AI_API_KEY = process.env['REV_AI_API_KEY']

const MAX_POLL_TIME_MS = 30 * 60 * 1000
const INITIAL_POLL_INTERVAL_MS = 2000
const MAX_POLL_INTERVAL_MS = 30000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> => {
  let lastError: Error | null = null
  let delay = 1000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      if (response.status === 429 || response.status >= 500) {
        const errorText = await response.text()
        lastError = new Error(`HTTP ${response.status}: ${errorText}`)
        l('Rev.ai request failed, retrying', { status: response.status, attempt: attempt + 1 })
        await sleep(delay)
        delay = Math.min(delay * 2, 30000)
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      l('Rev.ai request error, retrying', { error: lastError.message, attempt: attempt + 1 })
      await sleep(delay)
      delay = Math.min(delay * 2, 30000)
    }
  }

  throw lastError ?? new Error('Max retries exceeded')
}

export const transcribeWithRev = async (
  audioPath: string,
  outputDir: string,
  segmentOffsetMinutes: number = 0,
  segmentNumber?: number,
  totalSegments?: number,
  model: string = 'rev-machine',
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  try {
    if (!REV_AI_API_KEY) {
      err('REV_AI_API_KEY not found in environment')
      progressTracker?.error(2, 'Configuration error', 'REV_AI_API_KEY environment variable is required')
      throw new Error('REV_AI_API_KEY environment variable is required')
    }

    const startTime = Date.now()

    if (segmentNumber && totalSegments) {
      progressTracker?.updateStepWithSubStep(
        2,
        segmentNumber,
        totalSegments,
        `Segment ${segmentNumber}/${totalSegments}`,
        `Uploading audio segment ${segmentNumber}/${totalSegments} to Rev.ai`
      )
    } else {
      progressTracker?.updateStepProgress(2, baseProgress + 10, 'Uploading audio to Rev.ai')
    }

    const audioFile = Bun.file(audioPath)
    const fileSize = audioFile.size

    if (fileSize === 0) {
      throw new Error(`Audio file is empty: ${audioPath}`)
    }

    const audioBuffer = await audioFile.arrayBuffer()

    if (audioBuffer.byteLength === 0) {
      throw new Error(`Failed to read audio file: ${audioPath}`)
    }

    const fileName = audioPath.split('/').pop() || 'audio.wav'

    const ext = fileName.split('.').pop()?.toLowerCase()
    const mimeType = ext === 'wav' ? 'audio/wav' : ext === 'mp3' ? 'audio/mpeg' : 'application/octet-stream'

    l('Creating Rev.ai transcription job', { fileName, fileSize, bufferSize: audioBuffer.byteLength, mimeType })

    const formData = new FormData()
    formData.append('media', new Blob([audioBuffer], { type: mimeType }), fileName)
    formData.append('skip_diarization', 'false')

    const createResponse = await fetchWithRetry(`${REV_API_BASE}/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REV_AI_API_KEY}`
      },
      body: formData
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      err(`Rev.ai job creation failed. Status: ${createResponse.status}`, { error: errorText })
      throw new Error(`Rev.ai job creation failed: ${createResponse.statusText} - ${errorText}`)
    }

    const jobData = await createResponse.json()
    const job = validateOrThrow(RevJobResponseSchema, jobData, 'Invalid Rev.ai job response')
    const jobId = job.id

    l('Rev.ai job created', { jobId, status: job.status })

    progressTracker?.updateStepProgress(2, baseProgress + 20, 'Waiting for Rev.ai transcription')

    const pollStartTime = Date.now()
    let pollInterval = INITIAL_POLL_INTERVAL_MS
    let jobStatus = job.status

    while (jobStatus !== 'transcribed' && jobStatus !== 'failed') {
      if (Date.now() - pollStartTime > MAX_POLL_TIME_MS) {
        throw new Error(`Rev.ai transcription timed out after ${MAX_POLL_TIME_MS / 1000} seconds`)
      }

      await sleep(pollInterval)
      pollInterval = Math.min(pollInterval * 1.5, MAX_POLL_INTERVAL_MS)

      const statusResponse = await fetchWithRetry(`${REV_API_BASE}/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${REV_AI_API_KEY}`
        }
      })

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text()
        err(`Rev.ai status check failed. Status: ${statusResponse.status}`, { error: errorText })
        throw new Error(`Rev.ai status check failed: ${statusResponse.statusText} - ${errorText}`)
      }

      const statusData = await statusResponse.json()
      const statusJob = validateOrThrow(RevJobResponseSchema, statusData, 'Invalid Rev.ai job status response')
      jobStatus = statusJob.status

      const elapsed = Math.round((Date.now() - pollStartTime) / 1000)
      l('Rev.ai job status', { jobId, status: jobStatus, elapsedSeconds: elapsed })

      const progressPercent = Math.min(baseProgress + 20 + (elapsed / 60) * 50, baseProgress + 70)
      progressTracker?.updateStepProgress(2, progressPercent, `Transcribing with Rev.ai (${elapsed}s)`)
    }

    if (jobStatus === 'failed') {
      const statusResponse = await fetch(`${REV_API_BASE}/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${REV_AI_API_KEY}` }
      })
      const failedJob = await statusResponse.json()
      const failureDetail = failedJob.failure_detail || 'Unknown error'
      err('Rev.ai transcription failed', { jobId, failureDetail })
      throw new Error(`Rev.ai transcription failed: ${failureDetail}`)
    }

    progressTracker?.updateStepProgress(2, baseProgress + 75, 'Fetching Rev.ai transcript')

    const transcriptResponse = await fetchWithRetry(`${REV_API_BASE}/jobs/${jobId}/transcript`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REV_AI_API_KEY}`,
        'Accept': 'application/vnd.rev.transcript.v1.0+json'
      }
    })

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text()
      err(`Rev.ai transcript fetch failed. Status: ${transcriptResponse.status}`, { error: errorText })
      throw new Error(`Rev.ai transcript fetch failed: ${transcriptResponse.statusText} - ${errorText}`)
    }

    progressTracker?.updateStepProgress(2, baseProgress + 85, 'Processing Rev.ai response')

    const rawTranscript = await transcriptResponse.json()
    const transcript = validateOrThrow(RevTranscriptResponseSchema, rawTranscript, 'Invalid Rev.ai transcript response')

    progressTracker?.updateStepProgress(2, baseProgress + 90, 'Parsing Rev.ai transcription')

    const transcription = parseRevOutput(transcript, segmentOffsetMinutes)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const outputPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    if (!segmentNumber) {
      progressTracker?.completeStep(2, 'Rev.ai transcription complete')
    }

    const metadata: Step2Metadata = {
      transcriptionService: 'rev',
      transcriptionModel: model,
      processingTime,
      tokenCount
    }

    l('Rev.ai transcription completed', {
      processingTimeMs: processingTime,
      tokenCount,
      transcriptLength: transcription.text.length,
      segmentCount: transcription.segments.length,
      outputPath,
      segmentNumber,
      totalSegments,
      jobId
    })

    return {
      result: transcription,
      metadata
    }
  } catch (error) {
    err('Failed to transcribe with Rev.ai', error)
    progressTracker?.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

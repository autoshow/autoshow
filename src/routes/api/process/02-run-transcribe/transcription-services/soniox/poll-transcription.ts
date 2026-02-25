import { l, err } from '~/utils/logging'
import type { SonioxTranscriptionStatusResponse, IProgressTracker } from '~/types'
import { SonioxTranscriptionStatusResponseSchema, validateOrThrow } from '~/types'

const SONIOX_API_BASE = 'https://api.soniox.com/v1'
const MAX_POLL_TIME_MS = 20 * 60 * 1000
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
        l('Soniox request failed, retrying', { status: response.status, attempt: attempt + 1 })
        await sleep(delay)
        delay = Math.min(delay * 2, 30000)
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      l('Soniox request error, retrying', { error: lastError.message, attempt: attempt + 1 })
      await sleep(delay)
      delay = Math.min(delay * 2, 30000)
    }
  }

  throw lastError ?? new Error('Max retries exceeded')
}

export const pollSonioxTranscription = async (
  transcriptionId: string,
  apiKey: string,
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<SonioxTranscriptionStatusResponse> => {
  const pollStartTime = Date.now()
  let pollInterval = INITIAL_POLL_INTERVAL_MS

  while (true) {
    if (Date.now() - pollStartTime > MAX_POLL_TIME_MS) {
      throw new Error(`Soniox transcription timed out after ${MAX_POLL_TIME_MS / 1000} seconds`)
    }

    const response = await fetchWithRetry(`${SONIOX_API_BASE}/transcriptions/${transcriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      err(`Soniox status check failed. Status: ${response.status}`, { error: errorText })
      throw new Error(`Soniox status check failed: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    const result = validateOrThrow(SonioxTranscriptionStatusResponseSchema, data, 'Invalid Soniox transcript response')

    const elapsed = Math.round((Date.now() - pollStartTime) / 1000)
    l('Soniox transcript status', { id: transcriptionId, status: result.status, elapsedSeconds: elapsed })

    if (result.status === 'completed') {
      return result
    }

    if (result.status === 'error') {
      const errorMessage = result.error_message || 'Unknown error'
      err('Soniox transcription failed', { id: transcriptionId, error: errorMessage, type: result.error_type })
      throw new Error(`Soniox transcription failed: ${errorMessage}`)
    }

    const progressPercent = Math.min(baseProgress + 20 + (elapsed / 60) * 50, baseProgress + 70)
    progressTracker?.updateStepProgress(2, progressPercent, `Transcribing with Soniox (${elapsed}s)`)

    await sleep(pollInterval)
    pollInterval = Math.min(pollInterval * 1.5, MAX_POLL_INTERVAL_MS)
  }
}

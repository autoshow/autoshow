import type { IProgressTracker,SonioxTranscriptionStatusResponse } from '~/types'
import { SonioxTranscriptionStatusResponseSchema,validateOrThrow } from '~/types'
import { fetchSonioxWithRetry } from './request'

const SONIOX_API_BASE = 'https://api.soniox.com/v1'
const MAX_POLL_TIME_MS = 20 * 60 * 1000
const INITIAL_POLL_INTERVAL_MS = 2000
const MAX_POLL_INTERVAL_MS = 30000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

    const response = await fetchSonioxWithRetry(`${SONIOX_API_BASE}/transcriptions/${transcriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    }, 'Soniox transcription status check')

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Soniox status check failed: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    const result = validateOrThrow(SonioxTranscriptionStatusResponseSchema, data, 'Invalid Soniox transcript response')

    const elapsed = Math.round((Date.now() - pollStartTime) / 1000)

    if (result.status === 'completed') {
      return result
    }

    if (result.status === 'error') {
      const errorMessage = result.error_message || 'Unknown error'
      throw new Error(`Soniox transcription failed: ${errorMessage}`)
    }

    const progressPercent = Math.min(baseProgress + 20 + (elapsed / 60) * 50, baseProgress + 70)
    progressTracker?.updateStepProgress(2, progressPercent, `Transcribing with Soniox (${elapsed}s)`)

    await sleep(pollInterval)
    pollInterval = Math.min(pollInterval * 1.5, MAX_POLL_INTERVAL_MS)
  }
}

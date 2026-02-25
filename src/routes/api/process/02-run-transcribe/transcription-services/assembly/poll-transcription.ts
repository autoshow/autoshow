import { l, err } from '~/utils/logging'
import type { AssemblyTranscriptResponse, IProgressTracker } from '~/types'
import { AssemblyTranscriptResponseSchema, validateOrThrow } from '~/types'

const ASSEMBLY_API_BASE = 'https://api.assemblyai.com/v2'
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
        l('AssemblyAI request failed, retrying', { status: response.status, attempt: attempt + 1 })
        await sleep(delay)
        delay = Math.min(delay * 2, 30000)
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      l('AssemblyAI request error, retrying', { error: lastError.message, attempt: attempt + 1 })
      await sleep(delay)
      delay = Math.min(delay * 2, 30000)
    }
  }

  throw lastError ?? new Error('Max retries exceeded')
}

export const pollAssemblyTranscription = async (
  transcriptId: string,
  apiKey: string,
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<AssemblyTranscriptResponse> => {
  const pollStartTime = Date.now()
  let pollInterval = INITIAL_POLL_INTERVAL_MS

  while (true) {
    if (Date.now() - pollStartTime > MAX_POLL_TIME_MS) {
      throw new Error(`AssemblyAI transcription timed out after ${MAX_POLL_TIME_MS / 1000} seconds`)
    }

    const response = await fetchWithRetry(`${ASSEMBLY_API_BASE}/transcript/${transcriptId}`, {
      method: 'GET',
      headers: {
        'authorization': apiKey
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      err(`AssemblyAI status check failed. Status: ${response.status}`, { error: errorText })
      throw new Error(`AssemblyAI status check failed: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    const result = validateOrThrow(AssemblyTranscriptResponseSchema, data, 'Invalid AssemblyAI transcript response')

    const elapsed = Math.round((Date.now() - pollStartTime) / 1000)
    l('AssemblyAI transcript status', { id: transcriptId, status: result.status, elapsedSeconds: elapsed })

    if (result.status === 'completed') {
      return result
    }

    if (result.status === 'error') {
      const errorMessage = result.error || 'Unknown error'
      err('AssemblyAI transcription failed', { id: transcriptId, error: errorMessage })
      throw new Error(`AssemblyAI transcription failed: ${errorMessage}`)
    }

    const progressPercent = Math.min(baseProgress + 20 + (elapsed / 60) * 50, baseProgress + 70)
    progressTracker?.updateStepProgress(2, progressPercent, `Transcribing with AssemblyAI (${elapsed}s)`)

    await sleep(pollInterval)
    pollInterval = Math.min(pollInterval * 1.5, MAX_POLL_INTERVAL_MS)
  }
}

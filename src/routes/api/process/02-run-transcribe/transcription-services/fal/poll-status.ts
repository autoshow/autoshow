import { l } from '~/utils/logging'
import type { IProgressTracker, FalWhisperOutput, FalStatusResponse } from '~/types'
import { FalStatusResponseSchema, FalWhisperOutputSchema, validateOrThrow } from '~/types'

const FAL_STATUS_URL = 'https://queue.fal.run/fal-ai/whisper/requests'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const pollFalStatus = async (
  requestId: string,
  apiKey: string,
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<FalWhisperOutput> => {
  const statusUrl = `${FAL_STATUS_URL}/${requestId}/status`
  const resultUrl = `${FAL_STATUS_URL}/${requestId}`

  let attempts = 0
  const maxAttempts = 300
  const pollInterval = 2000
  const startTime = Date.now()

  while (attempts < maxAttempts) {
    const statusResponse = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${apiKey}` }
    })

    if (!statusResponse.ok) {
      throw new Error(`Fal status check failed: ${statusResponse.status}`)
    }

    const rawStatusData = await statusResponse.json()
    const statusData = validateOrThrow(FalStatusResponseSchema, rawStatusData, 'Invalid Fal status response') as FalStatusResponse

    if (statusData.status === 'COMPLETED') {
      const resultResponse = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${apiKey}` }
      })

      if (!resultResponse.ok) {
        const errorText = await resultResponse.text()
        throw new Error(`Fal result fetch failed: ${resultResponse.status} - ${errorText}`)
      }

      const rawResultData = await resultResponse.json()
      const resultData = validateOrThrow(FalWhisperOutputSchema, rawResultData, 'Invalid Fal whisper output') as FalWhisperOutput

      const elapsedMs = Date.now() - startTime
      l('Fal transcription polling completed', {
        requestId,
        elapsedMs,
        attempts: attempts + 1
      })

      return resultData
    }

    if (statusData.status === 'FAILED') {
      throw new Error(`Fal transcription failed: ${statusData.error || 'Unknown error'}`)
    }

    const progress = Math.min(baseProgress + 20 + (attempts / maxAttempts) * 50, baseProgress + 70)
    progressTracker?.updateStepProgress(2, progress, `Processing with diarization (${statusData.status})`)

    await sleep(pollInterval)
    attempts++
  }

  throw new Error('Fal transcription timed out')
}

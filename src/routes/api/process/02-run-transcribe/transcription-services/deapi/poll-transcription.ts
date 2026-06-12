import { DeapiStatusResponseSchema,validateOrThrow,type DeapiStatusResponse,type IProgressTracker } from '~/types'

const DEAPI_API_BASE = 'https://api.deapi.ai'
const DEAPI_API_KEY = process.env['DEAPI_API_KEY']

export const pollDeapiTranscription = async (
  requestId: string,
  progressTracker?: IProgressTracker
): Promise<DeapiStatusResponse> => {
  if (!DEAPI_API_KEY) {
    throw new Error('DEAPI_API_KEY environment variable is required')
  }

  const maxAttempts = 600
  const pollInterval = 5000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${DEAPI_API_BASE}/api/v1/client/request-status/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${DEAPI_API_KEY}`
      }
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`Failed to check deAPI transcription status: ${response.statusText} - ${responseText}`)
    }

    let rawData
    try {
      rawData = JSON.parse(responseText)
    } catch {
      throw new Error(`deAPI status response is not valid JSON: ${responseText.substring(0, 200)}`)
    }

    const data = validateOrThrow(DeapiStatusResponseSchema, rawData, 'Invalid deAPI status response')

    if (data.data.status === 'done') {
      return data
    }

    if (data.data.status === 'error') {
      const errorMsg = data.data.error || 'Unknown error'
      throw new Error(`deAPI transcription failed: ${errorMsg}`)
    }

    if (attempt % 6 === 0 && attempt > 0) {
      const elapsed = attempt * pollInterval / 1000
      const progress = Math.min(65, 20 + (attempt / maxAttempts) * 45)
      progressTracker?.updateStepProgress(2, progress, `Transcribing with deAPI... (${Math.floor(elapsed)}s elapsed)`)
    }

    await Bun.sleep(pollInterval)
  }

  throw new Error('deAPI transcription timed out after 50 minutes')
}

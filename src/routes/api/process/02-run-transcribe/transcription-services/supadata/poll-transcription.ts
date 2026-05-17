import { SupadataJobStatusResponseSchema,validateOrThrow,type IProgressTracker,type SupadataJobStatusResponse } from '~/types'

const SUPADATA_API_BASE = 'https://api.supadata.ai/v1'
const SUPADATA_API_KEY = process.env['SUPADATA_API_KEY']

export const pollSupadataTranscription = async (
  jobId: string,
  progressTracker?: IProgressTracker
): Promise<SupadataJobStatusResponse> => {
  if (!SUPADATA_API_KEY) {
    throw new Error('SUPADATA_API_KEY environment variable is required')
  }

  const maxAttempts = 600
  const pollInterval = 5000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${SUPADATA_API_BASE}/transcript/${jobId}`, {
      headers: {
        'x-api-key': SUPADATA_API_KEY
      }
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`Failed to check Supadata transcription status: ${response.statusText} - ${responseText}`)
    }

    let rawData
    try {
      rawData = JSON.parse(responseText)
    } catch {
      throw new Error(`Supadata status response is not valid JSON: ${responseText.substring(0, 200)}`)
    }

    const data = validateOrThrow(SupadataJobStatusResponseSchema, rawData, 'Invalid Supadata status response')

    if (data.status === 'completed') {
      return data
    }

    if (data.status === 'failed') {
      const errorMsg = data.error || 'Unknown error'
      throw new Error(`Supadata transcription failed: ${errorMsg}`)
    }

    if (attempt % 6 === 0 && attempt > 0) {
      const elapsed = attempt * pollInterval / 1000
      const progress = Math.min(65, 20 + (attempt / maxAttempts) * 45)
      progressTracker?.updateStepProgress(2, progress, `Transcribing with Supadata... (${Math.floor(elapsed)}s elapsed)`)
    }

    await Bun.sleep(pollInterval)
  }

  throw new Error('Supadata transcription timed out after 50 minutes')
}

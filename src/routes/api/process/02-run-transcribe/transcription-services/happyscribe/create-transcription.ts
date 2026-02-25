import { l, err } from '~/utils/logging'
import { HappyScribeTranscriptionResponseSchema, validateOrThrow, type IProgressTracker } from '~/types'

const HAPPYSCRIBE_API_BASE = 'https://www.happyscribe.com/api/v1'

export const createTranscription = async (
  url: string,
  name: string,
  apiKey: string,
  organizationId: string
): Promise<string> => {
  const language = 'en-US'

  const response = await fetch(`${HAPPYSCRIBE_API_BASE}/transcriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transcription: {
        name,
        language,
        tmp_url: url,
        is_subtitle: false,
        organization_id: organizationId
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    err('Failed to create HappyScribe transcription', { status: response.status, error: errorText })
    throw new Error(`Failed to create HappyScribe transcription: ${response.statusText} - ${errorText}`)
  }

  const rawData = await response.json()
  const data = validateOrThrow(HappyScribeTranscriptionResponseSchema, rawData, 'Invalid HappyScribe transcription response')

  l('HappyScribe transcription job created', {
    transcriptionId: data.id,
    name,
    language
  })

  return data.id
}

export const pollTranscriptionStatus = async (
  transcriptionId: string,
  apiKey: string,
  progressTracker?: IProgressTracker
): Promise<void> => {
  const maxAttempts = 600
  const pollInterval = 10000
  const startTime = Date.now()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${HAPPYSCRIBE_API_BASE}/transcriptions/${transcriptionId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      err('HappyScribe status check failed', { status: response.status })
      throw new Error(`Failed to check transcription status: ${response.statusText}`)
    }

    const rawData = await response.json()
    const data = validateOrThrow(HappyScribeTranscriptionResponseSchema, rawData, 'Invalid HappyScribe status response')

    if (data.state === 'automatic_done') {
      const elapsedMs = Date.now() - startTime
      l('HappyScribe transcription polling completed', {
        transcriptionId,
        elapsedMs,
        attempts: attempt + 1
      })
      return
    }

    if (data.state === 'failed') {
      const failureMessage = data.failureMessage || 'Unknown error'
      err('HappyScribe transcription failed', { reason: failureMessage })
      throw new Error(`HappyScribe transcription failed: ${failureMessage}`)
    }

    if (data.state === 'locked') {
      err('HappyScribe transcription locked due to insufficient account balance')
      throw new Error('HappyScribe transcription locked due to insufficient account balance')
    }

    if (attempt % 6 === 0 && attempt > 0) {
      const elapsed = attempt * pollInterval / 1000
      const progress = Math.min(65, 20 + (attempt / maxAttempts) * 45)
      progressTracker?.updateStepProgress(2, progress, `Transcribing... (${Math.floor(elapsed)}s elapsed)`)
    }

    await Bun.sleep(pollInterval)
  }

  err('HappyScribe transcription polling timed out', { maxAttempts, pollInterval })
  throw new Error('HappyScribe transcription timed out after 100 minutes')
}

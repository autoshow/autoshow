import type { IProgressTracker } from '~/types/progress'
import { l, err } from '~/utils/logging'
import { HappyScribeTranscriptionResponseSchema, validateOrThrow } from '~/types/main'

const HAPPYSCRIBE_API_BASE = 'https://www.happyscribe.com/api/v1'
const HAPPYSCRIBE_API_KEY = process.env['HAPPYSCRIBE_API_KEY']
const HAPPYSCRIBE_ORGANIZATION_ID = process.env['HAPPYSCRIBE_ORGANIZATION_ID']

export const createTranscription = async (url: string, name: string): Promise<string> => {
  if (!HAPPYSCRIBE_API_KEY) {
    err(`HAPPYSCRIBE_API_KEY not found in environment`)
    throw new Error('HAPPYSCRIBE_API_KEY environment variable is required')
  }

  if (!HAPPYSCRIBE_ORGANIZATION_ID) {
    err(`HAPPYSCRIBE_ORGANIZATION_ID not found in environment`)
    throw new Error('HAPPYSCRIBE_ORGANIZATION_ID environment variable is required')
  }

  const language = "en-US"
  
  const response = await fetch(`${HAPPYSCRIBE_API_BASE}/transcriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HAPPYSCRIBE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transcription: {
        name,
        language,
        tmp_url: url,
        is_subtitle: false,
        organization_id: HAPPYSCRIBE_ORGANIZATION_ID
      }
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    err(`Failed to create transcription. Status: ${response.status}`)
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

export const pollTranscriptionStatus = async (transcriptionId: string, progressTracker?: IProgressTracker): Promise<void> => {
  if (!HAPPYSCRIBE_API_KEY) {
    err(`HAPPYSCRIBE_API_KEY not found in environment`)
    throw new Error('HAPPYSCRIBE_API_KEY environment variable is required')
  }

  const maxAttempts = 600
  const pollInterval = 10000
  const startTime = Date.now()
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${HAPPYSCRIBE_API_BASE}/transcriptions/${transcriptionId}`, {
      headers: {
        'Authorization': `Bearer ${HAPPYSCRIBE_API_KEY}`
      }
    })
    
    if (!response.ok) {
      err(`Status check failed. Status: ${response.status}`)
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
      err(`Transcription failed with reason: ${failureMessage}`)
      throw new Error(`HappyScribe transcription failed: ${failureMessage}`)
    }
    
    if (data.state === 'locked') {
      err(`Transcription locked due to insufficient credits`)
      throw new Error('HappyScribe transcription locked due to insufficient credits')
    }
    
    if (attempt % 6 === 0 && attempt > 0) {
      const elapsed = attempt * pollInterval / 1000
      const progress = Math.min(65, 20 + (attempt / maxAttempts) * 45)
      progressTracker?.updateStepProgress(2, progress, `Transcribing... (${Math.floor(elapsed)}s elapsed)`)
    }
    
    await Bun.sleep(pollInterval)
  }
  
  err(`Transcription polling timed out after ${maxAttempts * pollInterval / 1000}s`)
  throw new Error('HappyScribe transcription timed out after 100 minutes')
}
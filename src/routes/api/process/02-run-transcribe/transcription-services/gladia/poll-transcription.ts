import { l, err } from '~/utils/logging'
import { GladiaTranscriptionStatusResponseSchema, validateOrThrow, type IProgressTracker, type GladiaTranscriptionStatusResponse } from '~/types'

const GLADIA_API_KEY = process.env['GLADIA_API_KEY']

export const pollGladiaTranscription = async (
  resultUrl: string,
  progressTracker?: IProgressTracker
): Promise<GladiaTranscriptionStatusResponse> => {
  if (!GLADIA_API_KEY) {
    err('GLADIA_API_KEY not found in environment')
    throw new Error('GLADIA_API_KEY environment variable is required')
  }

  const maxAttempts = 600
  const pollInterval = 5000
  const startTime = Date.now()
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(resultUrl, {
      headers: {
        'x-gladia-key': GLADIA_API_KEY
      }
    })
    
    if (!response.ok) {
      err(`Gladia status check failed. Status: ${response.status}`)
      throw new Error(`Failed to check Gladia transcription status: ${response.statusText}`)
    }
    
    const rawData = await response.json()
    const data = validateOrThrow(GladiaTranscriptionStatusResponseSchema, rawData, 'Invalid Gladia status response')
    
    if (data.status === 'done') {
      const elapsedMs = Date.now() - startTime
      l('Gladia transcription polling completed', {
        transcriptionId: data.id,
        elapsedMs,
        attempts: attempt + 1
      })
      return data
    }
    
    if (data.status === 'error') {
      const errorCode = data.error_code || 'Unknown'
      err(`Gladia transcription failed with error code: ${errorCode}`)
      throw new Error(`Gladia transcription failed with error code: ${errorCode}`)
    }
    
    if (attempt % 6 === 0 && attempt > 0) {
      const elapsed = attempt * pollInterval / 1000
      const progress = Math.min(65, 20 + (attempt / maxAttempts) * 45)
      progressTracker?.updateStepProgress(2, progress, `Transcribing with Gladia... (${Math.floor(elapsed)}s elapsed)`)
    }
    
    await Bun.sleep(pollInterval)
  }
  
  err(`Gladia transcription polling timed out after ${maxAttempts * pollInterval / 1000}s`)
  throw new Error('Gladia transcription timed out after 50 minutes')
}

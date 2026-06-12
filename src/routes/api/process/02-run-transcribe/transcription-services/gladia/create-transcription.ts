import { GladiaTranscriptionInitResponseSchema,validateOrThrow,type GladiaTranscriptionInitResponse,type GladiaTranscriptionOptions } from '~/types'

const GLADIA_API_BASE = 'https://api.gladia.io'
const GLADIA_API_KEY = process.env['GLADIA_API_KEY']

export const createGladiaTranscription = async (options: GladiaTranscriptionOptions): Promise<GladiaTranscriptionInitResponse> => {
  if (!GLADIA_API_KEY) {
    throw new Error('GLADIA_API_KEY environment variable is required')
  }

  const requestBody = {
    audio_url: options.audioUrl,
    diarization: options.enableDiarization ?? true,
    diarization_config: {
      min_speakers: 1,
      max_speakers: 10
    },
    detect_language: options.detectLanguage ?? true,
    language: options.language || 'en'
  }
  
  const response = await fetch(`${GLADIA_API_BASE}/v2/pre-recorded`, {
    method: 'POST',
    headers: {
      'x-gladia-key': GLADIA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create Gladia transcription: ${response.statusText} - ${errorText}`)
  }
  
  const rawData = await response.json()
  const data = validateOrThrow(GladiaTranscriptionInitResponseSchema, rawData, 'Invalid Gladia transcription init response')
  
  
  return data
}

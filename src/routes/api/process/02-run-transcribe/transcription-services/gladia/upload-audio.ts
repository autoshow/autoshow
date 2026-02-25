import { l, err } from '~/utils/logging'
import { GladiaUploadResponseSchema, validateOrThrow, type GladiaUploadResponse } from '~/types'

const GLADIA_API_BASE = 'https://api.gladia.io'
const GLADIA_API_KEY = process.env['GLADIA_API_KEY']

export const uploadAudioToGladia = async (audioPath: string): Promise<GladiaUploadResponse> => {
  if (!GLADIA_API_KEY) {
    err('GLADIA_API_KEY not found in environment')
    throw new Error('GLADIA_API_KEY environment variable is required')
  }

  const audioFile = Bun.file(audioPath)
  const audioBuffer = await audioFile.arrayBuffer()
  const fileName = audioPath.split('/').pop() || 'audio.wav'
  
  const formData = new FormData()
  formData.append('audio', new Blob([audioBuffer]), fileName)
  
  const response = await fetch(`${GLADIA_API_BASE}/v2/upload`, {
    method: 'POST',
    headers: {
      'x-gladia-key': GLADIA_API_KEY
    },
    body: formData
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    err(`Failed to upload audio to Gladia. Status: ${response.status}`, { error: errorText })
    throw new Error(`Failed to upload audio to Gladia: ${response.statusText} - ${errorText}`)
  }
  
  const rawData = await response.json()
  const data = validateOrThrow(GladiaUploadResponseSchema, rawData, 'Invalid Gladia upload response')
  
  l('Audio uploaded to Gladia', {
    audioUrl: data.audio_url,
    duration: data.audio_metadata.audio_duration,
    size: data.audio_metadata.size
  })
  
  return data
}

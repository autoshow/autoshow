import { l, err } from '~/utils/logging'
import { AssemblyTranscriptResponseSchema, validateOrThrow } from '~/types'

const ASSEMBLY_API_BASE = 'https://api.assemblyai.com/v2'

export const createAssemblyTranscription = async (
  audioUrl: string,
  model: string,
  apiKey: string
): Promise<string> => {
  l('Creating AssemblyAI transcription', { model })

  const response = await fetch(`${ASSEMBLY_API_BASE}/transcript`, {
    method: 'POST',
    headers: {
      'authorization': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      speech_model: model
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    err(`AssemblyAI transcription creation failed. Status: ${response.status}`, { error: errorText })
    throw new Error(`AssemblyAI transcription creation failed: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const result = validateOrThrow(AssemblyTranscriptResponseSchema, data, 'Invalid AssemblyAI transcription response')

  l('AssemblyAI transcription job created', { id: result.id, status: result.status })

  return result.id
}

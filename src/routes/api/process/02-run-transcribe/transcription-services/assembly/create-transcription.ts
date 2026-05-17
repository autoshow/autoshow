import { AssemblyTranscriptResponseSchema,validateOrThrow } from '~/types'

const ASSEMBLY_API_BASE = 'https://api.assemblyai.com/v2'

export const createAssemblyTranscription = async (
  audioUrl: string,
  model: string,
  apiKey: string
): Promise<string> => {

  const response = await fetch(`${ASSEMBLY_API_BASE}/transcript`, {
    method: 'POST',
    headers: {
      'authorization': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      speech_models: [model]
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AssemblyAI transcription creation failed: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const result = validateOrThrow(AssemblyTranscriptResponseSchema, data, 'Invalid AssemblyAI transcription response')

  return result.id
}

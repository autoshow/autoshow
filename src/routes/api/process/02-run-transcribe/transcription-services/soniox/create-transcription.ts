import { l, err } from '~/utils/logging'
import { SonioxTranscriptionInitResponseSchema, validateOrThrow } from '~/types'

const SONIOX_API_BASE = 'https://api.soniox.com/v1'

export const createSonioxTranscription = async (
  fileId: string,
  model: string,
  apiKey: string
): Promise<string> => {
  l('Creating Soniox transcription', { model, fileId })

  const response = await fetch(`${SONIOX_API_BASE}/transcriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      file_id: fileId,
      enable_speaker_diarization: true
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    err(`Soniox transcription creation failed. Status: ${response.status}`, { error: errorText })
    throw new Error(`Soniox transcription creation failed: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const result = validateOrThrow(SonioxTranscriptionInitResponseSchema, data, 'Invalid Soniox transcription response')

  l('Soniox transcription job created', { id: result.id, status: result.status })

  return result.id
}

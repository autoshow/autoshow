import { SonioxTranscriptionInitResponseSchema,validateOrThrow } from '~/types'
import { fetchSonioxWithRetry } from './request'

const SONIOX_API_BASE = 'https://api.soniox.com/v1'

export const createSonioxTranscription = async (
  fileId: string,
  model: string,
  apiKey: string
): Promise<string> => {

  const response = await fetchSonioxWithRetry(`${SONIOX_API_BASE}/transcriptions`, {
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
  }, 'Soniox transcription creation')

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Soniox transcription creation failed: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const result = validateOrThrow(SonioxTranscriptionInitResponseSchema, data, 'Invalid Soniox transcription response')

  return result.id
}

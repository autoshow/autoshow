import type { SonioxTranscriptResponse } from '~/types'
import { SonioxTranscriptResponseSchema,validateOrThrow } from '~/types'
import { fetchSonioxWithRetry } from './request'

const SONIOX_API_BASE = 'https://api.soniox.com/v1'

export const getSonioxTranscript = async (
  transcriptionId: string,
  apiKey: string
): Promise<SonioxTranscriptResponse> => {

  const response = await fetchSonioxWithRetry(`${SONIOX_API_BASE}/transcriptions/${transcriptionId}/transcript`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  }, 'Soniox transcript fetch')

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Soniox transcript fetch failed: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const result = validateOrThrow(SonioxTranscriptResponseSchema, data, 'Invalid Soniox transcript response')

  return result
}

import { l, err } from '~/utils/logging'
import type { SonioxTranscriptResponse } from '~/types'
import { SonioxTranscriptResponseSchema, validateOrThrow } from '~/types'

const SONIOX_API_BASE = 'https://api.soniox.com/v1'

export const getSonioxTranscript = async (
  transcriptionId: string,
  apiKey: string
): Promise<SonioxTranscriptResponse> => {
  l('Fetching Soniox transcript', { transcriptionId })

  const response = await fetch(`${SONIOX_API_BASE}/transcriptions/${transcriptionId}/transcript`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    err(`Soniox transcript fetch failed. Status: ${response.status}`, { error: errorText })
    throw new Error(`Soniox transcript fetch failed: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const result = validateOrThrow(SonioxTranscriptResponseSchema, data, 'Invalid Soniox transcript response')

  l('Soniox transcript fetched', {
    transcriptionId,
    hasText: !!result.text,
    tokenCount: result.tokens?.length ?? 0
  })

  return result
}

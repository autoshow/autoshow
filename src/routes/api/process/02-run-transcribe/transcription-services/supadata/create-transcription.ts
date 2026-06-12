import type { SupadataJobResponse,SupadataTranscriptResponse } from '~/types'
import { SupadataJobResponseSchema,SupadataTranscriptResponseSchema,validateOrThrow } from '~/types'

const SUPADATA_API_BASE = 'https://api.supadata.ai/v1'
const SUPADATA_API_KEY = process.env['SUPADATA_API_KEY']

export const createSupadataTranscription = async (
  videoUrl: string
): Promise<SupadataTranscriptResponse | SupadataJobResponse> => {
  if (!SUPADATA_API_KEY) {
    throw new Error('SUPADATA_API_KEY environment variable is required')
  }

  const encodedUrl = encodeURIComponent(videoUrl)

  const response = await fetch(`${SUPADATA_API_BASE}/transcript?url=${encodedUrl}`, {
    method: 'GET',
    headers: {
      'x-api-key': SUPADATA_API_KEY
    }
  })

  const responseText = await response.text()

  if (response.status === 202) {
    let rawData
    try {
      rawData = JSON.parse(responseText)
    } catch {
      throw new Error(`Supadata 202 response is not valid JSON: ${responseText.substring(0, 200)}`)
    }

    const data = validateOrThrow(SupadataJobResponseSchema, rawData, 'Invalid Supadata job response')

    return data
  }

  if (!response.ok) {
    throw new Error(`Failed to create Supadata transcription: ${response.statusText} - ${responseText}`)
  }

  let rawData
  try {
    rawData = JSON.parse(responseText)
  } catch {
    throw new Error(`Supadata response is not valid JSON: ${responseText.substring(0, 200)}`)
  }

  const data = validateOrThrow(SupadataTranscriptResponseSchema, rawData, 'Invalid Supadata transcript response')

  return data
}

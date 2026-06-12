import { DeapiCreateResponseSchema,validateOrThrow } from '~/types'

const DEAPI_API_BASE = 'https://api.deapi.ai'
const DEAPI_API_KEY = process.env['DEAPI_API_KEY']

export const createDeapiTranscription = async (videoUrl: string): Promise<string> => {
  if (!DEAPI_API_KEY) {
    throw new Error('DEAPI_API_KEY environment variable is required')
  }

  const requestBody = {
    video_url: videoUrl,
    include_ts: true,
    model: 'WhisperLargeV3'
  }

  const response = await fetch(`${DEAPI_API_BASE}/api/v1/client/vid2txt`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(`Failed to create deAPI transcription: ${response.statusText} - ${responseText}`)
  }

  let rawData
  try {
    rawData = JSON.parse(responseText)
  } catch {
    throw new Error(`deAPI create response is not valid JSON: ${responseText.substring(0, 200)}`)
  }

  const data = validateOrThrow(DeapiCreateResponseSchema, rawData, 'Invalid deAPI create response')

  return data.data.request_id
}

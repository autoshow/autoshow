import { HappyScribeExportResponseSchema,validateOrThrow } from '~/types'

const HAPPYSCRIBE_API_BASE = 'https://www.happyscribe.com/api/v1'

export const createExport = async (transcriptionId: string, apiKey: string): Promise<string> => {
  const response = await fetch(`${HAPPYSCRIBE_API_BASE}/exports`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      export: {
        format: 'json',
        transcription_ids: [transcriptionId]
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create HappyScribe export: ${response.statusText} - ${errorText}`)
  }

  const rawData = await response.json()
  const data = validateOrThrow(HappyScribeExportResponseSchema, rawData, 'Invalid HappyScribe export response')

  return data.id
}

export const pollExportStatus = async (exportId: string, apiKey: string): Promise<string> => {
  const maxAttempts = 60
  const pollInterval = 2000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${HAPPYSCRIBE_API_BASE}/exports/${exportId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to check export status: ${response.statusText}`)
    }

    const rawData = await response.json()
    const data = validateOrThrow(HappyScribeExportResponseSchema, rawData, 'Invalid HappyScribe export status response')

    if (data.state === 'ready') {
      if (!data.download_link) {
        throw new Error('No download link found in export response')
      }


      return data.download_link
    }

    if (data.state === 'failed') {
      throw new Error('HappyScribe export failed')
    }

    if (data.state === 'expired') {
      throw new Error('HappyScribe export expired')
    }

    await Bun.sleep(pollInterval)
  }

  throw new Error('HappyScribe export timed out after 2 minutes')
}

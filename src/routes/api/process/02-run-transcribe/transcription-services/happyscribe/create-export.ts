import { l, err } from '~/utils/logging'
import { HappyScribeExportResponseSchema, validateOrThrow } from '~/types'

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
    err('Failed to create HappyScribe export', { status: response.status, error: errorText })
    throw new Error(`Failed to create HappyScribe export: ${response.statusText} - ${errorText}`)
  }

  const rawData = await response.json()
  const data = validateOrThrow(HappyScribeExportResponseSchema, rawData, 'Invalid HappyScribe export response')

  l('HappyScribe export created', {
    exportId: data.id,
    transcriptionId,
    format: 'json'
  })

  return data.id
}

export const pollExportStatus = async (exportId: string, apiKey: string): Promise<string> => {
  const maxAttempts = 60
  const pollInterval = 2000
  const startTime = Date.now()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${HAPPYSCRIBE_API_BASE}/exports/${exportId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      err('HappyScribe export status check failed', { status: response.status })
      throw new Error(`Failed to check export status: ${response.statusText}`)
    }

    const rawData = await response.json()
    const data = validateOrThrow(HappyScribeExportResponseSchema, rawData, 'Invalid HappyScribe export status response')

    if (data.state === 'ready') {
      if (!data.download_link) {
        err('HappyScribe export ready but no download_link found')
        throw new Error('No download link found in export response')
      }

      const elapsedMs = Date.now() - startTime
      l('HappyScribe export polling completed', {
        exportId,
        elapsedMs,
        attempts: attempt + 1
      })

      return data.download_link
    }

    if (data.state === 'failed') {
      err('HappyScribe export failed')
      throw new Error('HappyScribe export failed')
    }

    if (data.state === 'expired') {
      err('HappyScribe export expired')
      throw new Error('HappyScribe export expired')
    }

    await Bun.sleep(pollInterval)
  }

  err('HappyScribe export polling timed out', { maxAttempts, pollInterval })
  throw new Error('HappyScribe export timed out after 2 minutes')
}

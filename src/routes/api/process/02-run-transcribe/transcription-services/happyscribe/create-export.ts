import { l, err } from '~/utils/logging'
import { HappyScribeExportResponseSchema, validateOrThrow } from '~/types/main'

const HAPPYSCRIBE_API_BASE = 'https://www.happyscribe.com/api/v1'
const HAPPYSCRIBE_API_KEY = process.env['HAPPYSCRIBE_API_KEY']

export const createExport = async (transcriptionId: string): Promise<string> => {
  if (!HAPPYSCRIBE_API_KEY) {
    err(`HAPPYSCRIBE_API_KEY not found in environment`)
    throw new Error('HAPPYSCRIBE_API_KEY environment variable is required')
  }
  
  const response = await fetch(`${HAPPYSCRIBE_API_BASE}/exports`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HAPPYSCRIBE_API_KEY}`,
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
    err(`Failed to create export. Status: ${response.status}`)
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

export const pollExportStatus = async (exportId: string): Promise<string> => {
  if (!HAPPYSCRIBE_API_KEY) {
    err(`HAPPYSCRIBE_API_KEY not found in environment`)
    throw new Error('HAPPYSCRIBE_API_KEY environment variable is required')
  }

  const maxAttempts = 60
  const pollInterval = 2000
  const startTime = Date.now()
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${HAPPYSCRIBE_API_BASE}/exports/${exportId}`, {
      headers: {
        'Authorization': `Bearer ${HAPPYSCRIBE_API_KEY}`
      }
    })
    
    if (!response.ok) {
      err(`Export status check failed. Status: ${response.status}`)
      throw new Error(`Failed to check export status: ${response.statusText}`)
    }
    
    const rawData = await response.json()
    const data = validateOrThrow(HappyScribeExportResponseSchema, rawData, 'Invalid HappyScribe export status response')
    
    if (data.state === 'ready') {
      if (!data.download_link) {
        err(`No download_link found in export response`)
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
      err(`Export failed`)
      throw new Error('HappyScribe export failed')
    }
    
    if (data.state === 'expired') {
      err(`Export expired`)
      throw new Error('HappyScribe export expired')
    }
    
    await Bun.sleep(pollInterval)
  }
  
  err(`Export polling timed out after ${maxAttempts * pollInterval / 1000}s`)
  throw new Error('HappyScribe export timed out after 2 minutes')
}
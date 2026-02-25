import { l } from '~/utils/logging'
import type { FalQueueResponse } from '~/types'
import { FalQueueResponseSchema, validateOrThrow } from '~/types'

const FAL_QUEUE_URL = 'https://queue.fal.run/fal-ai/whisper'

export const submitToFalQueue = async (audioUrl: string, apiKey: string): Promise<string> => {
  const response = await fetch(FAL_QUEUE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      task: 'transcribe',
      chunk_level: 'segment',
      version: '3',
      diarize: true,
      batch_size: 64
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Fal queue submission failed: ${response.status} - ${errorText}`)
  }

  const rawData = await response.json()
  const data = validateOrThrow(FalQueueResponseSchema, rawData, 'Invalid Fal queue response') as FalQueueResponse

  l('Fal queue job submitted', {
    requestId: data.request_id,
    status: data.status
  })

  return data.request_id
}

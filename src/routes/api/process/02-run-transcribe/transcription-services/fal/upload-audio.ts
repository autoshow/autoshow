import { l } from '~/utils/logging'
import type { FalStorageInitiateResponse } from '~/types'
import { FalStorageInitiateResponseSchema, validateOrThrow } from '~/types'

const FAL_STORAGE_INITIATE_URL = 'https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3'

export const uploadAudioToFal = async (audioPath: string, apiKey: string): Promise<string> => {
  const audioFile = Bun.file(audioPath)
  const audioBuffer = await audioFile.arrayBuffer()
  const fileName = audioPath.split('/').pop() || 'audio.wav'
  const contentType = audioPath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav'

  const initiateResponse = await fetch(FAL_STORAGE_INITIATE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      file_name: fileName,
      content_type: contentType
    })
  })

  if (!initiateResponse.ok) {
    const errorText = await initiateResponse.text()
    throw new Error(`Fal storage initiate failed: ${initiateResponse.status} - ${errorText}`)
  }

  const rawData = await initiateResponse.json()
  const data = validateOrThrow(FalStorageInitiateResponseSchema, rawData, 'Invalid Fal storage initiate response') as FalStorageInitiateResponse

  const uploadResponse = await fetch(data.upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType
    },
    body: audioBuffer
  })

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    throw new Error(`Fal storage upload failed: ${uploadResponse.status} - ${errorText}`)
  }

  l('Audio uploaded to Fal storage', {
    fileName,
    fileUrl: data.file_url
  })

  return data.file_url
}

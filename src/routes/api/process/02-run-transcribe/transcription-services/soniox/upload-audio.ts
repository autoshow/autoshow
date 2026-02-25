import { l, err } from '~/utils/logging'
import { SonioxFileUploadResponseSchema, validateOrThrow } from '~/types'

const SONIOX_API_BASE = 'https://api.soniox.com/v1'

export const uploadAudioToSoniox = async (
  audioPath: string,
  apiKey: string
): Promise<string> => {
  const audioFile = Bun.file(audioPath)
  const audioBuffer = await audioFile.arrayBuffer()
  const fileName = audioPath.split('/').pop() || 'audio.mp3'

  l('Uploading audio to Soniox', {
    fileName,
    sizeBytes: audioBuffer.byteLength
  })

  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer]), fileName)

  const response = await fetch(`${SONIOX_API_BASE}/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    err(`Soniox upload failed. Status: ${response.status}`, { error: errorText })
    throw new Error(`Soniox upload failed: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const result = validateOrThrow(SonioxFileUploadResponseSchema, data, 'Invalid Soniox upload response')

  l('Soniox upload complete', { fileId: result.id })

  return result.id
}

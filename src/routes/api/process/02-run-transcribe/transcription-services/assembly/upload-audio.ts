import { l, err } from '~/utils/logging'
import { AssemblyUploadResponseSchema, validateOrThrow } from '~/types'

const ASSEMBLY_API_BASE = 'https://api.assemblyai.com/v2'

const getContentType = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'mp3': return 'audio/mpeg'
    case 'wav': return 'audio/wav'
    case 'flac': return 'audio/flac'
    case 'm4a': return 'audio/mp4'
    case 'ogg': return 'audio/ogg'
    case 'webm': return 'audio/webm'
    default: return 'application/octet-stream'
  }
}

export const uploadAudioToAssembly = async (
  audioPath: string,
  apiKey: string
): Promise<string> => {
  const audioFile = Bun.file(audioPath)
  const fileSize = audioFile.size

  if (fileSize === 0) {
    throw new Error(`Audio file is empty: ${audioPath}`)
  }

  const audioBuffer = await audioFile.arrayBuffer()

  if (audioBuffer.byteLength === 0) {
    throw new Error(`Failed to read audio file: ${audioPath}`)
  }

  const contentType = getContentType(audioPath)

  l('Uploading audio to AssemblyAI', {
    fileName: audioPath.split('/').pop(),
    fileSize,
    bufferSize: audioBuffer.byteLength,
    contentType
  })

  const response = await fetch(`${ASSEMBLY_API_BASE}/upload`, {
    method: 'POST',
    headers: {
      'authorization': apiKey,
      'content-type': contentType
    },
    body: audioBuffer
  })

  if (!response.ok) {
    const errorText = await response.text()
    err(`AssemblyAI upload failed. Status: ${response.status}`, { error: errorText })
    throw new Error(`AssemblyAI upload failed: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const result = validateOrThrow(AssemblyUploadResponseSchema, data, 'Invalid AssemblyAI upload response')

  l('AssemblyAI upload complete', { uploadUrl: result.upload_url.substring(0, 50) + '...' })

  return result.upload_url
}

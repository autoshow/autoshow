import { S3Client } from 'bun'
import { l, err } from '~/utils/logging'
import type { S3UploadResult } from '~/types/s3-types'
import path from 'path'

const BUCKET = process.env['BUCKET']
const ACCESS_KEY_ID = process.env['ACCESS_KEY_ID']
const SECRET_ACCESS_KEY = process.env['SECRET_ACCESS_KEY']
const REGION = process.env['REGION']
const ENDPOINT = process.env['ENDPOINT']

const CONTENT_TYPE_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  webp: 'image/webp'
}

export const createS3Client = (): S3Client | null => {
  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !ENDPOINT || !BUCKET) {
    return null
  }

  return new S3Client({
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    endpoint: ENDPOINT,
    bucket: BUCKET,
    region: REGION || 'auto'
  })
}

export const isS3Configured = (): boolean => {
  return !!(ACCESS_KEY_ID && SECRET_ACCESS_KEY && ENDPOINT && BUCKET)
}

const PRESIGN_EXPIRY_SECONDS = 100 * 365 * 24 * 60 * 60

export const buildS3Url = (objectKey: string): string => {
  return `https://${BUCKET}.${new URL(ENDPOINT!).host}/${objectKey}`
}

export const presignS3Url = (client: S3Client, objectKey: string): string => {
  const s3File = client.file(objectKey)
  return s3File.presign({ expiresIn: PRESIGN_EXPIRY_SECONDS })
}

export const getContentType = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || ''
  return CONTENT_TYPE_MAP[ext] || 'application/octet-stream'
}

export const uploadToS3 = async (
  filePath: string,
  jobId: string,
  category: string
): Promise<S3UploadResult | null> => {
  if (!isS3Configured()) {
    l('S3 not configured, skipping upload', { filePath, category })
    return null
  }

  try {
    const client = createS3Client()
    if (!client) return null

    const fileName = path.basename(filePath)
    const objectKey = `media/${category}/${jobId}/${Date.now()}-${fileName}`
    const contentType = getContentType(fileName)

    l('Uploading to S3', { objectKey, contentType, category })

    const localFile = Bun.file(filePath)
    const fileSize = localFile.size

    const s3File = client.file(objectKey)

    if (fileSize > 50 * 1024 * 1024) {
      const writer = s3File.writer({ retry: 3, queueSize: 10, partSize: 5 * 1024 * 1024 })
      const reader = localFile.stream().getReader()
      let done = false
      while (!done) {
        const result = await reader.read()
        done = result.done
        if (result.value) {
          writer.write(result.value)
        }
      }
      await writer.end()
    } else {
      const fileContent = await localFile.arrayBuffer()
      await s3File.write(new Uint8Array(fileContent), { type: contentType })
    }

    const s3Url = presignS3Url(client, objectKey)
    const uploadedAt = Date.now()

    l('S3 upload complete', { objectKey, size: fileSize })

    return { s3Url, objectKey, uploadedAt }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    err('S3 upload failed: ' + errorMessage)
    return null
  }
}

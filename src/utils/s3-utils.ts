import { S3Client } from 'bun'
import { mkdir,rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import path from 'path'
import type { S3UploadResult } from '~/types'

type S3Environment = {
  bucket: string | undefined
  accessKeyId: string | undefined
  secretAccessKey: string | undefined
  region: string | undefined
  endpoint: string | undefined
}

type S3ObjectStat = {
  size: number
  lastModified?: Date
  etag?: string
}

const getContentType = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || ''
  return CONTENT_TYPE_MAP[ext] || 'application/octet-stream'
}

const getS3Environment = (): S3Environment => ({
  bucket: process.env['BUCKET'],
  accessKeyId: process.env['ACCESS_KEY_ID'],
  secretAccessKey: process.env['SECRET_ACCESS_KEY'],
  region: process.env['REGION'],
  endpoint: process.env['ENDPOINT']
})

export const buildS3Url = (objectKey: string): string => {
  const { bucket, endpoint } = getS3Environment()
  if (!bucket || !endpoint) {
    throw new Error('S3 storage is not configured')
  }
  return `https://${bucket}.${new URL(endpoint).host}/${objectKey}`
}

export const getConfiguredS3UrlOrigin = (): string | null => {
  const { bucket, endpoint } = getS3Environment()
  if (!bucket || !endpoint) {
    return null
  }

  try {
    return `https://${bucket}.${new URL(endpoint).host}`
  } catch {
    return null
  }
}

export const parseObjectKeyFromS3Url = (url: string): string | null => {
  const expectedOrigin = getConfiguredS3UrlOrigin()
  if (!expectedOrigin) {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  if (parsed.origin !== expectedOrigin || parsed.search || parsed.hash) {
    return null
  }

  const objectKey = parsed.pathname.replace(/^\/+/, '')
  return objectKey.length > 0 ? objectKey : null
}

export const isS3Configured = (): boolean => {
  const { accessKeyId, secretAccessKey, endpoint, bucket } = getS3Environment()
  return !!(accessKeyId && secretAccessKey && endpoint && bucket)
}

const CONTENT_TYPE_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  webp: 'image/webp'
}

export const createS3Client = (): S3Client | null => {
  const { accessKeyId, secretAccessKey, endpoint, bucket, region } = getS3Environment()

  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
    return null
  }

  return new S3Client({
    accessKeyId,
    secretAccessKey,
    endpoint,
    bucket,
    region: region || 'auto'
  })
}

export const createPresignedPutUrl = (
  objectKey: string,
  contentType: string,
  expiresInSeconds: number
): string => {
  const client = createS3Client()
  if (!client) {
    throw new Error('S3 storage is not configured')
  }

  return client.file(objectKey).presign({
    method: 'PUT',
    expiresIn: expiresInSeconds,
    type: contentType || 'application/octet-stream'
  })
}

export const statS3Object = async (objectKey: string): Promise<S3ObjectStat | null> => {
  const client = createS3Client()
  if (!client) return null

  try {
    const stat = await client.file(objectKey).stat()
    const statLike = stat as { size?: unknown, lastModified?: unknown, etag?: unknown }
    const size = typeof statLike.size === 'number' ? statLike.size : undefined
    if (size === undefined) return null

    return {
      size,
      ...(statLike.lastModified instanceof Date ? { lastModified: statLike.lastModified } : {}),
      ...(typeof statLike.etag === 'string' ? { etag: statLike.etag } : {})
    }
  } catch {
    return null
  }
}

export const downloadS3ObjectToFile = async (
  objectKey: string,
  destinationPath: string
): Promise<void> => {
  const client = createS3Client()
  if (!client) {
    throw new Error('S3 storage is not configured')
  }

  await mkdir(dirname(destinationPath), { recursive: true })

  const reader = client.file(objectKey).stream().getReader()
  const writer = Bun.file(destinationPath).writer()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) writer.write(value)
    }
    await writer.end()
  } catch (error) {
    await Promise.resolve(writer.end()).catch(() => {})
    await rm(destinationPath, { force: true }).catch(() => {})
    throw error
  }
}

const getContentDisposition = (
  disposition: 'inline' | 'attachment',
  filename?: string
): string => {
  if (!filename) {
    return disposition
  }

  const safeFilename = filename
    .replace(/[/\\\r\n"]/g, '_')
    .trim() || 'download'

  return `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
}

export const streamS3ObjectToResponse = async (
  objectKey: string,
  options: { disposition: 'inline' | 'attachment', filename?: string }
): Promise<Response> => {
  const client = createS3Client()
  if (!client) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const s3File = client.file(objectKey)
    const stat = await s3File.stat()
    const statLike = stat as { size?: unknown }
    const size = typeof statLike.size === 'number' ? statLike.size : null
    if (size === null) {
      return new Response('Not found', { status: 404 })
    }

    return new Response(s3File.stream(), {
      status: 200,
      headers: {
        'Content-Type': getContentType(objectKey),
        'Content-Length': size.toString(),
        'Content-Disposition': getContentDisposition(options.disposition, options.filename),
        'Cache-Control': 'private, no-store',
        'Accept-Ranges': 'bytes'
      }
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

export const uploadToS3 = async (
  filePath: string,
  jobId: string,
  category: string
): Promise<S3UploadResult | null> => {
  if (!isS3Configured()) {
    return null
  }

  try {
    const client = createS3Client()
    if (!client) return null

    const fileName = path.basename(filePath)
    const objectKey = `media/${category}/${jobId}/${Date.now()}-${fileName}`
    const contentType = getContentType(fileName)

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

    const s3Url = buildS3Url(objectKey)
    const uploadedAt = Date.now()

    return { s3Url, objectKey, uploadedAt }
  } catch (error) {
    return null
  }
}

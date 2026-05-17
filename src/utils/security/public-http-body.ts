import { mkdir,rm } from 'node:fs/promises'
import { dirname } from 'node:path'

export class PublicHttpMaxBytesExceededError extends Error {
  readonly maxBytes: number
  readonly actualBytes: number | undefined

  constructor(maxBytes: number, actualBytes?: number) {
    const detail = actualBytes !== undefined
      ? `response size ${formatBytes(actualBytes)} exceeds maximum allowed size of ${formatBytes(maxBytes)}`
      : `response exceeds maximum allowed size of ${formatBytes(maxBytes)}`
    super(`Remote URL: ${detail}`)
    this.name = 'PublicHttpMaxBytesExceededError'
    this.maxBytes = maxBytes
    this.actualBytes = actualBytes
  }
}

export const isPublicHttpMaxBytesExceededError = (
  error: unknown
): error is PublicHttpMaxBytesExceededError => {
  return error instanceof PublicHttpMaxBytesExceededError
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const parseContentLength = (headers: Record<string, string>): number | undefined => {
  const rawContentLength = headers['content-length']
  if (!rawContentLength) {
    return undefined
  }

  const parsed = Number.parseInt(rawContentLength, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const enforceContentLengthLimit = (
  headers: Record<string, string>,
  maxBytes: number
): void => {
  const contentLength = parseContentLength(headers)
  if (contentLength !== undefined && contentLength > maxBytes) {
    throw new PublicHttpMaxBytesExceededError(maxBytes, contentLength)
  }
}

export const streamResponseToFile = async (
  response: Response,
  outputPath: string,
  maxBytes: number
): Promise<void> => {
  await mkdir(dirname(outputPath), { recursive: true })

  const body = response.body
  if (!body) throw new Error('Response has no body')

  const reader = body.getReader()
  const writer = Bun.file(outputPath).writer()
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        throw new PublicHttpMaxBytesExceededError(maxBytes, totalBytes)
      }
      writer.write(value)
    }
    await writer.end()
  } catch (error) {
    reader.releaseLock()
    try { await writer.end() } catch {}
    await rm(outputPath, { force: true })
    throw error
  }

  reader.releaseLock()
}

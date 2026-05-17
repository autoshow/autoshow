import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import type { SourceRoutesApiProcess01DlAudioFileMetadataFileDirectFileHeaderMetadata as DirectFileHeaderMetadata,SourceRoutesApiProcess01DlAudioFileMetadataFileDirectFileMetadata as DirectFileMetadata } from '~/types'
import {
PublicHttpMaxBytesExceededError,
downloadPublicHttpUrlToFile,
getPublicHttpUrlHeaders,
isPublicHttpMaxBytesExceededError
} from '~/utils/security/public-http'
import { executeCommand } from '../dl-utils'
import { getMaxAudioInputBytes } from '../remote-source-limits'

const parseContentLength = (headers: Record<string, string>): number | undefined => {
  const rawContentLength = headers['content-length']
  if (!rawContentLength) {
    return undefined
  }

  const parsed = Number.parseInt(rawContentLength, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

const getDirectFileHeaders = async (url: string): Promise<DirectFileHeaderMetadata> => {
  try {
    const headers = await getPublicHttpUrlHeaders(url)
    const fileSize = parseContentLength(headers)
    const mimeType = headers['content-type']?.trim()
    return {
      ...(fileSize !== undefined ? { fileSize } : {}),
      ...(mimeType ? { mimeType } : {}),
    }
  } catch (error) {
    return {}
  }
}

const probeDirectFileDuration = async (downloadPath: string): Promise<number | undefined> => {
  const probeResult = await executeCommand('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    downloadPath
  ])

  if (probeResult.exitCode === 0 && probeResult.stdout.trim()) {
    return parseFloat(probeResult.stdout.trim())
  }

  if (probeResult.exitCode !== 0) {
  }

  return undefined
}

export const getDirectFileMetadata = async (url: string): Promise<DirectFileMetadata> => {
  try {

    const maxBytes = getMaxAudioInputBytes()
    const headerMetadata = await getDirectFileHeaders(url)

    if (headerMetadata.fileSize !== undefined && headerMetadata.fileSize > maxBytes) {
      return { error: new PublicHttpMaxBytesExceededError(maxBytes, headerMetadata.fileSize).message }
    }

    const downloadPath = `${tmpdir()}/autoshow-direct-file-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const downloadResult = await downloadPublicHttpUrlToFile(url, downloadPath, maxBytes)
    const downloadedFile = Bun.file(downloadPath)
    const fileSize = headerMetadata.fileSize ?? parseContentLength(downloadResult.headers) ?? downloadedFile.size
    const mimeType = headerMetadata.mimeType ?? downloadResult.headers['content-type']?.trim()

    try {
      const duration = await probeDirectFileDuration(downloadPath)

      return {
        ...(duration !== undefined && { duration }),
        ...(fileSize !== undefined && { fileSize }),
        ...(mimeType !== undefined && { mimeType })
      }
    } finally {
      await rm(downloadPath, { force: true })
    }
  } catch (error) {
    if (isPublicHttpMaxBytesExceededError(error)) {
      return { error: error.message }
    }

    return {}
  }
}

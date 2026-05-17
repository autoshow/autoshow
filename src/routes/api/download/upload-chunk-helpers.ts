import { getDuration } from '~/routes/api/process/01-dl-audio/dl-utils'
import type { SourceRoutesApiDownloadUploadChunkHelpersUploadMetadata as UploadMetadata } from '~/types'
import { CHUNKS_ROOT,UPLOAD_LIMITS,UPLOAD_ROOT,getChunkMetadataPath } from './upload-security'

const loadUploadMetadata = async (metadataPath: string): Promise<UploadMetadata | null> => {
  const file = Bun.file(metadataPath)
  if (!(await file.exists())) return null

  try {
    const metadata = await file.json()
    if (
      !metadata ||
      typeof metadata !== 'object' ||
      typeof (metadata as { fileName?: unknown }).fileName !== 'string' ||
      typeof (metadata as { totalChunks?: unknown }).totalChunks !== 'number' ||
      typeof (metadata as { createdAt?: unknown }).createdAt !== 'number'
    ) {
      return null
    }

    return metadata as UploadMetadata
  } catch {
    return null
  }
}

export const ensureChunkSessionMetadata = async (
  chunksDir: string,
  fileName: string,
  totalChunks: number
): Promise<void> => {
  const metadataPath = getChunkMetadataPath(chunksDir)
  const existingMetadata = await loadUploadMetadata(metadataPath)

  if (existingMetadata) {
    if (existingMetadata.totalChunks !== totalChunks || existingMetadata.fileName !== fileName) {
      throw new Error('Upload session metadata mismatch')
    }
    return
  }

  await Bun.write(metadataPath, JSON.stringify({
    fileName,
    totalChunks,
    createdAt: Date.now(),
  }))
}

const cleanupChunkSession = async (chunksDir: string, totalChunks: number): Promise<void> => {
  await Bun.file(getChunkMetadataPath(chunksDir)).delete().catch(() => {})

  for (let index = 0; index < totalChunks; index += 1) {
    await Bun.file(`${chunksDir}/chunk_${index}`).delete().catch(() => {})
  }

  await Bun.$`rmdir ${chunksDir}`.quiet().nothrow()
}

export const assembleUploadedChunks = async (
  chunksDir: string,
  totalChunks: number,
  fileName: string
): Promise<{ finalPath: string, finalSize: number }> => {

  const finalPath = `${UPLOAD_ROOT}/${Date.now()}_${fileName}`
  const sink = Bun.file(finalPath).writer()

  for (let index = 0; index < totalChunks; index += 1) {
    sink.write(await Bun.file(`${chunksDir}/chunk_${index}`).arrayBuffer())
  }

  await sink.end()
  await cleanupChunkSession(chunksDir, totalChunks)

  const finalSize = (await Bun.file(finalPath).stat()).size
  if (finalSize > UPLOAD_LIMITS.maxUploadBytes) {
    await Bun.file(finalPath).delete().catch(() => {})
    throw new Error('Upload exceeds maximum allowed size')
  }

  return { finalPath, finalSize }
}

export const probeUploadedFileDuration = async (filePath: string): Promise<number | undefined> => {
  const duration = await getDuration(filePath)
  if (duration !== undefined) {
    return duration
  }

  return undefined
}

export const resolveChunkUploadPaths = (scopedChunkUploadId: string) => ({
  chunksDir: `${CHUNKS_ROOT}/${scopedChunkUploadId}`,
  metadataPath: getChunkMetadataPath(`${CHUNKS_ROOT}/${scopedChunkUploadId}`),
})

import { json } from "@solidjs/router"
import type { APIEvent } from "@solidjs/start/server"
import * as v from "valibot"
import { UploadChunkInputSchema,validationErrorResponse } from "~/types"
import { err } from "~/utils/logger/logging"
import { assembleUploadedChunks,ensureChunkSessionMetadata,probeUploadedFileDuration,resolveChunkUploadPaths } from './upload-chunk-helpers'
import { writeUploadRegistryEntry } from './upload-registry'
import { buildScopedChunkUploadId,enforceUploadRequestPolicy,ensureChunkUploadAllowed,ensureChunkUploadCapacity,sanitizeUploadSegment } from './upload-security'

const writeChunkFile = async (
  chunksDir: string,
  chunkIndex: number,
  chunk: File
): Promise<void> => {
  await Bun.write(`${chunksDir}/chunk_${chunkIndex}`, await chunk.arrayBuffer())
}

const getUploadedChunks = async (chunksDir: string, totalChunks: number): Promise<number[]> => {
  const uploadedChunks: number[] = []

  for (let index = 0; index < totalChunks; index += 1) {
    const chunkPath = `${chunksDir}/chunk_${index}`
    if (await Bun.file(chunkPath).exists()) {
      uploadedChunks.push(index)
    }
  }

  return uploadedChunks
}

export async function POST({ request }: APIEvent) {
  try {
    try {
      await enforceUploadRequestPolicy(request.headers, 'chunk')
    } catch (rateLimitError) {
      return json(
        { error: rateLimitError instanceof Error ? rateLimitError.message : 'Too many upload requests' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const chunk = formData.get("chunk")

    if (!(chunk instanceof File)) {
      return json({ error: "Invalid chunk: expected File" }, { status: 400 })
    }

    const chunkIndexRaw = formData.get("chunkIndex")
    const totalChunksRaw = formData.get("totalChunks")
    const fileIdRaw = formData.get("fileId")
    const fileNameRaw = formData.get("fileName")

    const metadataResult = v.safeParse(UploadChunkInputSchema, {
      chunkIndex: chunkIndexRaw ? parseInt(String(chunkIndexRaw)) : undefined,
      totalChunks: totalChunksRaw ? parseInt(String(totalChunksRaw)) : undefined,
      fileId: fileIdRaw,
      fileName: fileNameRaw,
    })

    if (!metadataResult.success) {
      return validationErrorResponse(metadataResult.issues)
    }

    const { chunkIndex, totalChunks } = metadataResult.output
    const fileId = metadataResult.output.fileId
    const originalFileName = metadataResult.output.fileName
    const storedFileName = sanitizeUploadSegment(originalFileName, 200)

    try {
      ensureChunkUploadAllowed(chunk.size, chunkIndex, totalChunks)
    } catch (validationError) {
      return json(
        { error: validationError instanceof Error ? validationError.message : 'Chunk rejected' },
        { status: 413 }
      )
    }

    const scopedChunkUploadId = buildScopedChunkUploadId(fileId)
    const { chunksDir } = resolveChunkUploadPaths(scopedChunkUploadId)

    try {
      await ensureChunkUploadCapacity(scopedChunkUploadId)
    } catch (capacityError) {
      return json(
        { error: capacityError instanceof Error ? capacityError.message : 'Upload capacity reached' },
        { status: 429 }
      )
    }

    try {
      await ensureChunkSessionMetadata(chunksDir, originalFileName, totalChunks)
    } catch (sessionError) {
      return json(
        { error: sessionError instanceof Error ? sessionError.message : 'Upload session metadata mismatch' },
        { status: 400 }
      )
    }

    await writeChunkFile(chunksDir, chunkIndex, chunk)
    const uploadedChunks = await getUploadedChunks(chunksDir, totalChunks)

    if (uploadedChunks.length === totalChunks) {
      try {
        const { finalPath, finalSize } = await assembleUploadedChunks(chunksDir, totalChunks, storedFileName)
        const duration = await probeUploadedFileDuration(finalPath)
        const uploadRef = await writeUploadRegistryEntry({
          originalFileName,
          storedFilePath: finalPath,
          fileSize: finalSize,
          ...(duration !== undefined ? { duration } : {})
        })

        return json({
          complete: true,
          uploadId: uploadRef.uploadId,
          fileName: uploadRef.originalFileName,
          fileSize: finalSize,
          ...(duration !== undefined && { duration })
        })
      } catch (assemblyError) {
        const message = assemblyError instanceof Error ? assemblyError.message : 'Failed to assemble upload'
        const status = message === 'Upload exceeds maximum allowed size' ? 413 : 500
        return json({ error: message }, { status })
      }
    }

    return json({
      complete: false,
      uploadedChunks: uploadedChunks.length,
      totalChunks,
    })
  } catch (error) {
    err("Failed to process chunk", error)
    return json({ error: "Failed to process chunk" }, { status: 500 })
  }
}

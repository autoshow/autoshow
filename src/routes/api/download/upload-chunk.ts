import { json } from "@solidjs/router"
import type { APIEvent } from "@solidjs/start/server"
import * as v from "valibot"
import { l, err } from "~/utils/logging"
import { UploadChunkInputSchema, validationErrorResponse } from "~/types"
import { executeCommand } from '~/routes/api/process/01-dl-audio/dl-utils'

const joinPath = (...parts: Array<string | number>) => {
  const segs: string[] = []
  for (const part of parts) {
    const s = String(part)
    for (const seg of s.split("/")) {
      if (seg === "") continue
      segs.push(seg)
    }
  }
  return segs.join("/")
}

const safeSegment = (s: string) => {
  let out = ""
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    out += ch === "/" || ch === "\0" ? "_" : ch
  }
  return out
}

export async function POST({ request }: APIEvent) {
  try {
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
    const fileId = safeSegment(metadataResult.output.fileId)
    const fileName = safeSegment(metadataResult.output.fileName)

    const uploadDir = "./uploads"
    const chunksDir = joinPath(uploadDir, "chunks", fileId)

    await Bun.$`mkdir -p ${chunksDir}`.quiet()

    const chunkPath = joinPath(chunksDir, `chunk_${chunkIndex}`)
    await Bun.write(chunkPath, await chunk.arrayBuffer())

    const uploadedChunks: number[] = []
    for (let i = 0; i < totalChunks; i++) {
      const p = joinPath(chunksDir, `chunk_${i}`)
      if (await Bun.file(p).exists()) uploadedChunks.push(i)
    }

    if (uploadedChunks.length === totalChunks) {
      l(`All chunks received, assembling file: ${fileName}`)

      const finalPath = joinPath(uploadDir, `${Date.now()}_${fileName}`)
      const sink = Bun.file(finalPath).writer()

      for (let i = 0; i < totalChunks; i++) {
        const p = joinPath(chunksDir, `chunk_${i}`)
        sink.write(await Bun.file(p).arrayBuffer())
      }

      await sink.end()

      for (let i = 0; i < totalChunks; i++) {
        const p = joinPath(chunksDir, `chunk_${i}`)
        await Bun.file(p).delete().catch(() => {})
      }

      await Bun.$`rmdir ${chunksDir}`.quiet().nothrow()

      const finalSize = (await Bun.file(finalPath).stat()).size
      l(`File assembled successfully: ${finalPath} (${(finalSize / 1e9).toFixed(2)}GB)`)

      let duration: number | undefined = undefined
      try {
        const probeResult = await executeCommand('ffprobe', [
          '-v', 'error',
          '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          finalPath
        ])
        if (probeResult.exitCode === 0 && probeResult.stdout.trim()) {
          duration = parseFloat(probeResult.stdout.trim())
          l(`Uploaded file duration: ${duration}s`)
        }
      } catch (error) {
        l(`Could not detect duration for uploaded file`)
      }

      return json({
        complete: true,
        filePath: finalPath,
        fileName,
        fileSize: finalSize,
        ...(duration !== undefined && { duration })
      })
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
import { json } from "@solidjs/router"
import type { APIEvent } from "@solidjs/start/server"
import * as v from 'valibot'
import { l, err } from "../../utils/logging"
import { existsSync, statSync } from "fs"
import { join } from "path"
import { UploadChunkInputSchema, validationErrorResponse } from '~/types/main'

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
      fileName: fileNameRaw
    })
    
    if (!metadataResult.success) {
      return validationErrorResponse(metadataResult.issues)
    }
    
    const { chunkIndex, totalChunks, fileId, fileName } = metadataResult.output
    
    const uploadDir = "./uploads"
    const chunksDir = join(uploadDir, "chunks", fileId)
    const { exitCode } = await Bun.$`mkdir -p ${chunksDir}`.quiet()
    if (exitCode !== 0) throw new Error(`Failed to create directory: ${chunksDir}`)
    
    const chunkPath = join(chunksDir, `chunk_${chunkIndex}`)
    const arrayBuffer = await chunk.arrayBuffer()
    await Bun.write(chunkPath, arrayBuffer)
    
    const uploadedChunks = []
    for (let i = 0; i < totalChunks; i++) {
      if (existsSync(join(chunksDir, `chunk_${i}`))) {
        uploadedChunks.push(i)
      }
    }
    
    if (uploadedChunks.length === totalChunks) {
      l(`All chunks received, assembling file: ${fileName}`)
      
      const finalPath = join(uploadDir, `${Date.now()}_${fileName}`)
      const fileHandle = await Bun.file(finalPath).writer()
      
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = join(chunksDir, `chunk_${i}`)
        const chunkData = await Bun.file(chunkPath).arrayBuffer()
        fileHandle.write(chunkData)
      }
      
      await fileHandle.end()
      
      for (let i = 0; i < totalChunks; i++) {
        await Bun.$`rm -f ${join(chunksDir, `chunk_${i}`)}`.quiet()
      }
      await Bun.$`rmdir ${chunksDir}`.quiet()
      
      const finalSize = statSync(finalPath).size
      l(`File assembled successfully: ${finalPath} (${(finalSize / 1e9).toFixed(2)}GB)`)
      
      return json({
        complete: true,
        filePath: finalPath,
        fileName,
        fileSize: finalSize
      })
    }
    
    return json({
      complete: false,
      uploadedChunks: uploadedChunks.length,
      totalChunks
    })
  } catch (error) {
    err("Failed to process chunk", error)
    return json(
      { error: "Failed to process chunk" },
      { status: 500 }
    )
  }
}
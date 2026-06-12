import { json } from "@solidjs/router"
import type { APIEvent } from "@solidjs/start/server"
import { getDuration } from '~/routes/api/process/01-dl-audio/dl-utils'
import { err } from "~/utils/logger/logging"
import { writeUploadRegistryEntry } from './upload-registry'
import { UPLOAD_ROOT,enforceUploadRequestPolicy,ensureSimpleUploadAllowed,sanitizeUploadSegment } from './upload-security'

export async function POST({ request }: APIEvent) {
  try {
    try {
      await enforceUploadRequestPolicy(request.headers, 'simple')
    } catch (rateLimitError) {
      return json(
        { error: rateLimitError instanceof Error ? rateLimitError.message : 'Too many upload requests' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return json({ error: "No file provided or invalid file type" }, { status: 400 })
    }

    try {
      ensureSimpleUploadAllowed(file.size)
    } catch (validationError) {
      return json(
        { error: validationError instanceof Error ? validationError.message : 'Upload rejected' },
        { status: 413 }
      )
    }

    const uploadDir = UPLOAD_ROOT
    const { exitCode } = await Bun.$`mkdir -p ${uploadDir}`.quiet()
    if (exitCode !== 0) throw new Error(`Failed to create directory: ${uploadDir}`)

    const timestamp = Date.now()
    const sanitizedName = sanitizeUploadSegment(file.name, 200)
    const fileName = `${timestamp}_${sanitizedName}`
    const filePath = `${uploadDir}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    await Bun.write(filePath, arrayBuffer)

    const duration = await getDuration(filePath)

    const uploadRef = await writeUploadRegistryEntry({
      originalFileName: file.name,
      storedFilePath: filePath,
      fileSize: file.size,
      ...(duration !== undefined ? { duration } : {})
    })

    return json({
      success: true,
      uploadId: uploadRef.uploadId,
      fileName: uploadRef.originalFileName,
      fileSize: file.size,
      ...(duration !== undefined && { duration })
    })
  } catch (error) {
    err("Failed to upload file", error)
    return json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}

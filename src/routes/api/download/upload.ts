import { json } from "@solidjs/router"
import type { APIEvent } from "@solidjs/start/server"
import { l, err } from "~/utils/logging"
import { executeCommand } from '~/routes/api/process/01-dl-audio/dl-utils'

export async function POST({ request }: APIEvent) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    
    if (!(file instanceof File)) {
      err("No file provided in upload request or invalid file type")
      return json({ error: "No file provided or invalid file type" }, { status: 400 })
    }
    
    l(`Uploading file: ${file.name}`)
    
    const uploadDir = "./uploads"
    const { exitCode } = await Bun.$`mkdir -p ${uploadDir}`.quiet()
    if (exitCode !== 0) throw new Error(`Failed to create directory: ${uploadDir}`)
    
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${timestamp}_${sanitizedName}`
    const filePath = `${uploadDir}/${fileName}`
    
    const arrayBuffer = await file.arrayBuffer()
    await Bun.write(filePath, arrayBuffer)
    
    let duration: number | undefined = undefined
    try {
      const probeResult = await executeCommand('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath
      ])
      if (probeResult.exitCode === 0 && probeResult.stdout.trim()) {
        duration = parseFloat(probeResult.stdout.trim())
        l(`Uploaded file duration: ${duration}s`)
      }
    } catch (error) {
      l(`Could not detect duration for uploaded file`)
    }
    
    return json({ 
      success: true, 
      filePath,
      fileName: file.name,
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
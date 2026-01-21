import { json } from "@solidjs/router"
import type { APIEvent } from "@solidjs/start/server"
import { l, err } from "../../utils/logging"

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
    
    return json({ 
      success: true, 
      filePath,
      fileName: file.name,
      fileSize: file.size
    })
  } catch (error) {
    err("Failed to upload file", error)
    return json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}
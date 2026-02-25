import type { APIEvent } from "@solidjs/start/server"
import { l, err } from "~/utils/logging"
import { join } from "path"

export async function GET({ params }: APIEvent) {
  try {
    const pathSegments = params.path?.split('/') || []
    
    if (pathSegments.length < 2) {
      err('Invalid image path')
      return new Response('Invalid path', { status: 400 })
    }
    
    const showNoteId = pathSegments[0]
    const fileName = pathSegments.slice(1).join('/')
    
    const imagePath = join(process.cwd(), 'output', showNoteId!, fileName)
    
    l(`Serving image file: ${imagePath}`)
    
    const file = Bun.file(imagePath)
    
    if (!(await file.exists())) {
      err(`Image file not found: ${imagePath}`)
      return new Response('Image file not found', { status: 404 })
    }
    
    const arrayBuffer = await file.arrayBuffer()
    
    let contentType = 'image/png'
    if (fileName.endsWith('.png')) {
      contentType = 'image/png'
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      contentType = 'image/jpeg'
    } else if (fileName.endsWith('.webp')) {
      contentType = 'image/webp'
    } else if (fileName.endsWith('.gif')) {
      contentType = 'image/gif'
    }
    
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': file.size.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Accept-Ranges': 'bytes'
      }
    })
  } catch (error) {
    err('Failed to serve image file', error)
    return new Response('Internal server error', { status: 500 })
  }
}

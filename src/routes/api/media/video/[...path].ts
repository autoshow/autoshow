import type { APIEvent } from "@solidjs/start/server"
import { l, err } from "~/utils/logging"
import { join } from "path"

export async function GET({ params }: APIEvent) {
  try {
    const pathSegments = params.path?.split('/') || []
    
    if (pathSegments.length < 2) {
      err('Invalid video path')
      return new Response('Invalid path', { status: 400 })
    }
    
    const showNoteId = pathSegments[0]
    const fileName = pathSegments.slice(1).join('/')
    
    const videoPath = join(process.cwd(), 'output', showNoteId!, fileName)
    
    l(`Serving video file: ${videoPath}`)
    
    const file = Bun.file(videoPath)
    
    if (!(await file.exists())) {
      err(`Video file not found: ${videoPath}`)
      return new Response('Video file not found', { status: 404 })
    }
    
    const arrayBuffer = await file.arrayBuffer()
    
    let contentType = 'video/mp4'
    if (fileName.endsWith('.mp4')) {
      contentType = 'video/mp4'
    } else if (fileName.endsWith('.webm')) {
      contentType = 'video/webm'
    } else if (fileName.endsWith('.mov')) {
      contentType = 'video/quicktime'
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
    err('Failed to serve video file', error)
    return new Response('Internal server error', { status: 500 })
  }
}

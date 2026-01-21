import type { APIEvent } from "@solidjs/start/server"
import { l, err } from "../../../utils/logging"
import { join } from "path"

export async function GET({ params }: APIEvent) {
  try {
    const pathSegments = params.path?.split('/') || []
    
    if (pathSegments.length < 2) {
      err('Invalid audio path')
      return new Response('Invalid path', { status: 400 })
    }
    
    const showNoteId = pathSegments[0]
    const fileName = pathSegments.slice(1).join('/')
    
    const audioPath = join(process.cwd(), 'output', showNoteId!, fileName)
    
    l(`Serving audio file: ${audioPath}`)
    
    const file = Bun.file(audioPath)
    
    if (!(await file.exists())) {
      err(`Audio file not found: ${audioPath}`)
      return new Response('Audio file not found', { status: 404 })
    }
    
    const arrayBuffer = await file.arrayBuffer()
    
    let contentType = 'audio/wav'
    if (fileName.endsWith('.mp3')) {
      contentType = 'audio/mpeg'
    } else if (fileName.endsWith('.wav')) {
      contentType = 'audio/wav'
    } else if (fileName.endsWith('.ogg')) {
      contentType = 'audio/ogg'
    } else if (fileName.endsWith('.m4a')) {
      contentType = 'audio/mp4'
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
    err('Failed to serve audio file', error)
    return new Response('Internal server error', { status: 500 })
  }
}
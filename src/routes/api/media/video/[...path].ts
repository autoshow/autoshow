import type { APIEvent } from "@solidjs/start/server"
import { getDatabase,initializeSchema } from "~/database/db"
import { getShowNoteForViewer } from "~/database/notes/show-note-access"
import { err } from "~/utils/logger/logging"
import { parseMediaPath,resolveScopedMediaPath } from "../path-utils"

export async function GET({ params }: APIEvent) {
  try {
    const parsedPath = parseMediaPath(params.path)
    if (!parsedPath) {
      return new Response('Invalid path', { status: 400 })
    }

    const { showNoteId, fileName } = parsedPath
    const db = getDatabase()
    await initializeSchema(db)
    const showNote = await getShowNoteForViewer(db, showNoteId)
    if (!showNote) {
      return new Response('Not found', { status: 404 })
    }

    const videoPath = resolveScopedMediaPath(showNoteId, fileName)
    if (!videoPath) {
      err('Blocked video path traversal attempt', { showNoteId, fileName })
      return new Response('Invalid path', { status: 400 })
    }

    const file = Bun.file(videoPath)

    if (!(await file.exists())) {
      return new Response('Video file not found', { status: 404 })
    }

    const arrayBuffer = await file.arrayBuffer()

    const normalizedFileName = fileName.toLowerCase()
    let contentType = 'video/mp4'
    if (normalizedFileName.endsWith('.mp4')) {
      contentType = 'video/mp4'
    } else if (normalizedFileName.endsWith('.webm')) {
      contentType = 'video/webm'
    } else if (normalizedFileName.endsWith('.mov')) {
      contentType = 'video/quicktime'
    }

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': file.size.toString(),
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'Accept-Ranges': 'bytes'
      }
    })
  } catch (error) {
    err('Failed to serve video file', error)
    return new Response('Internal server error', { status: 500 })
  }
}

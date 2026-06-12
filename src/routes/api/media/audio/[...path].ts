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

    const audioPath = resolveScopedMediaPath(showNoteId, fileName)
    if (!audioPath) {
      err('Blocked audio path traversal attempt', { showNoteId, fileName })
      return new Response('Invalid path', { status: 400 })
    }

    const file = Bun.file(audioPath)

    if (!(await file.exists())) {
      return new Response('Audio file not found', { status: 404 })
    }

    const arrayBuffer = await file.arrayBuffer()

    const normalizedFileName = fileName.toLowerCase()
    let contentType = 'audio/wav'
    if (normalizedFileName.endsWith('.mp3')) {
      contentType = 'audio/mpeg'
    } else if (normalizedFileName.endsWith('.wav')) {
      contentType = 'audio/wav'
    } else if (normalizedFileName.endsWith('.ogg')) {
      contentType = 'audio/ogg'
    } else if (normalizedFileName.endsWith('.m4a')) {
      contentType = 'audio/mp4'
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
    err('Failed to serve audio file', error)
    return new Response('Internal server error', { status: 500 })
  }
}

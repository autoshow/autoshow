import type { APIEvent } from "@solidjs/start/server"
import * as v from 'valibot'
import { getDatabase,initializeSchema } from "~/database/db"
import { getShowNoteById } from "~/database/notes/show-note-access"
import { getShowNoteAsset } from "~/database/notes/show-note-assets"
import { ShowNoteIdSchema } from "~/types"
import {
  getStorageDownloadFilename,
  resolveShowNoteAssetStorageObjectKey,
  resolveShowNoteStorageObjectKey,
  type ShowNoteAssetStorageTarget,
} from "~/utils/show-note-storage"
import { err } from "~/utils/logger/logging"
import { streamS3ObjectToResponse } from "~/utils/s3-utils"

const StorageAssetIdSchema = v.pipe(
  v.string(),
  v.nonEmpty(),
  v.regex(/^[a-zA-Z0-9_-]+$/, 'Storage asset ID must contain only alphanumeric characters, hyphens, and underscores')
)

const parseIndex = (value: string | undefined): number | null => {
  if (value === undefined) return 0
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

const getDisposition = (request: Request): 'inline' | 'attachment' => {
  return new URL(request.url).searchParams.get('download') === '1'
    ? 'attachment'
    : 'inline'
}

const streamObjectKey = (request: Request, objectKey: string): Promise<Response> => {
  return streamS3ObjectToResponse(objectKey, {
    disposition: getDisposition(request),
    filename: getStorageDownloadFilename(objectKey),
  })
}

export async function handleShowNoteStorageTargetRequest({ request, params }: APIEvent) {
  try {
    const idResult = v.safeParse(ShowNoteIdSchema, params.id)
    if (!idResult.success) {
      return Response.json({ error: 'Invalid show note ID' }, { status: 400 })
    }

    const target = params.target
    if (!target) {
      return Response.json({ error: 'Invalid storage target' }, { status: 400 })
    }

    const index = parseIndex(params.index)
    if (index === null) {
      return Response.json({ error: 'Invalid storage index' }, { status: 400 })
    }

    const db = getDatabase()
    await initializeSchema(db)

    const note = await getShowNoteById(db, idResult.output)
    if (!note) {
      return Response.json({ error: 'Show note not found' }, { status: 404 })
    }

    const resolved = resolveShowNoteStorageObjectKey(note, target, index)
    if (!resolved.ok) {
      if (resolved.reason === 'invalid-target') {
        return Response.json({ error: 'Invalid storage target' }, { status: 400 })
      }
      if (resolved.reason === 'invalid-index') {
        return Response.json({ error: 'Invalid storage index' }, { status: 400 })
      }
      return Response.json({ error: 'Storage object not found' }, { status: 404 })
    }

    return await streamObjectKey(request, resolved.objectKey)
  } catch (error) {
    err('Failed to serve show note storage object', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function handleShowNoteAssetStorageRequest(
  event: APIEvent,
  target: ShowNoteAssetStorageTarget
) {
  const { request, params } = event

  try {
    const idResult = v.safeParse(ShowNoteIdSchema, params.id)
    if (!idResult.success) {
      return Response.json({ error: 'Invalid show note ID' }, { status: 400 })
    }

    const assetIdResult = v.safeParse(StorageAssetIdSchema, params.assetId)
    if (!assetIdResult.success) {
      return Response.json({ error: 'Invalid storage asset ID' }, { status: 400 })
    }

    const db = getDatabase()
    await initializeSchema(db)

    const note = await getShowNoteById(db, idResult.output)
    if (!note) {
      return Response.json({ error: 'Show note not found' }, { status: 404 })
    }

    const asset = await getShowNoteAsset(db, note.id, assetIdResult.output)
    if (!asset) {
      return Response.json({ error: 'Storage asset not found' }, { status: 404 })
    }

    const objectKey = resolveShowNoteAssetStorageObjectKey(asset, target)
    if (!objectKey) {
      return Response.json({ error: 'Storage object not found' }, { status: 404 })
    }

    return await streamObjectKey(request, objectKey)
  } catch (error) {
    err('Failed to serve show note asset storage object', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

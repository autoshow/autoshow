import type { APIEvent } from "@solidjs/start/server"
import type { SQL } from "bun"
import * as v from 'valibot'
import { getDatabase,initializeSchema } from "~/database/db"
import { ShowNoteIdSchema } from "~/types"
import { err } from "~/utils/logger/logging"

async function softDeleteShowNoteRecord(db: SQL, id: string): Promise<boolean> {
  const rows = await db`
    UPDATE show_notes
    SET deleted_at = ${Date.now()}
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id
  `

  return rows.length > 0
}

export async function DELETE({ params }: APIEvent) {
  try {
    const idResult = v.safeParse(ShowNoteIdSchema, params.id)
    if (!idResult.success) {
      return Response.json({ error: 'Invalid show note ID' }, { status: 400 })
    }
    const showNoteId = idResult.output

    const db = getDatabase()
    await initializeSchema(db)

    const deleted = await softDeleteShowNoteRecord(db, showNoteId)
    if (!deleted) {
      return Response.json({ error: 'Show note not found' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    err('Failed to delete show note', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

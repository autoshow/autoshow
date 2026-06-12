import type { SQL } from "bun"
import { ShowNoteAssetSchema,validateOrThrow,type ShowNote,type ShowNoteAsset, type ShowNoteAssetKind } from "~/types"

type ShowNoteAssetInsert = {
  id?: string | undefined
  showNoteId: string
  jobId: string
  kind: ShowNoteAssetKind
  service?: string | null | undefined
  model?: string | null | undefined
  filePath?: string | null | undefined
  thumbnailFilePath?: string | null | undefined
  metadata?: unknown
  createdAt?: number | undefined
}

const SHOW_NOTE_ASSET_SELECT_COLUMNS = `
  id, show_note_id, job_id, kind, service, model, file_path, thumbnail_file_path,
  metadata_json, created_at, updated_at
`

const toAssetRow = (row: unknown): ShowNoteAsset => {
  return validateOrThrow(ShowNoteAssetSchema, row, 'Invalid show note asset data in database')
}

export const getShowNoteAssets = async (
  db: SQL,
  showNoteId: string
): Promise<ShowNoteAsset[]> => {
  const rows = await db.unsafe(
    `SELECT ${SHOW_NOTE_ASSET_SELECT_COLUMNS}
     FROM show_note_assets
     WHERE show_note_id = ?
     ORDER BY created_at ASC, id ASC`,
    [showNoteId]
  )

  return Array.from(rows, toAssetRow)
}

export const getShowNoteAsset = async (
  db: SQL,
  showNoteId: string,
  assetId: string
): Promise<ShowNoteAsset | null> => {
  const rows = await db.unsafe(
    `SELECT ${SHOW_NOTE_ASSET_SELECT_COLUMNS}
     FROM show_note_assets
     WHERE show_note_id = ? AND id = ?
     LIMIT 1`,
    [showNoteId, assetId]
  )

  const row = rows[0]
  return row ? toAssetRow(row) : null
}

export const getLatestLlmAsset = async (
  db: SQL,
  showNoteId: string
): Promise<ShowNoteAsset | null> => {
  const rows = await db.unsafe(
    `SELECT ${SHOW_NOTE_ASSET_SELECT_COLUMNS}
     FROM show_note_assets
     WHERE show_note_id = ? AND kind = 'llm'
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [showNoteId]
  )

  const row = rows[0]
  return row ? toAssetRow(row) : null
}

export const hasShowNoteTextOutputForAppend = async (
  db: SQL,
  note: ShowNote
): Promise<boolean> => {
  if (note.text_output?.trim()) {
    return true
  }

  const rows = await db`
    SELECT id
    FROM show_note_assets
    WHERE show_note_id = ${note.id}
      AND kind = 'llm'
    LIMIT 1
  `

  return rows.length > 0
}

export const insertShowNoteAsset = async (
  db: SQL,
  input: ShowNoteAssetInsert
): Promise<void> => {
  const now = input.createdAt ?? Date.now()
  const metadataJson = input.metadata == null ? null : JSON.stringify(input.metadata)

  await db`
    INSERT INTO show_note_assets (
      id, show_note_id, job_id, kind, service, model, file_path,
      thumbnail_file_path, metadata_json, created_at, updated_at
    ) VALUES (
      ${input.id ?? crypto.randomUUID()},
      ${input.showNoteId},
      ${input.jobId},
      ${input.kind},
      ${input.service ?? null},
      ${input.model ?? null},
      ${input.filePath ?? null},
      ${input.thumbnailFilePath ?? null},
      ${metadataJson},
      ${now},
      ${now}
    )
  `
}

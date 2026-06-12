import { query } from "@solidjs/router"
import type { SQL } from "bun"
import * as v from 'valibot'
import { getDatabase,initializeSchema } from "~/database/db"
import { ShowNoteSchema,type ShowNote } from "~/types"
import { err } from "~/utils/logger/logging"

export const getShowNotes = query(async () => {
  "use server"

  const db = getDatabase()
  await initializeSchema(db)
  const showNotes = await getRecentShowNotes(db, 20)
  const { sanitizeShowNoteForClient } = await import("~/utils/show-note-storage")
  return showNotes.map(sanitizeShowNoteForClient)
}, "show-notes")

// Single column list shared by both the filtered and unfiltered queries below.
const SHOW_NOTES_SELECT_COLUMNS = `
  id, total_cost_usd, url, title, author, duration, prompt, text_output,
  transcription, transcription_service, transcription_model,
  document_service, document_model, document_type, document_page_count,
  document_processing_time, document_character_count, document_input_token_count, document_output_token_count, document_cost,
  llm_service, llm_model, processed_at, created_at, estimated_processing_breakdown, video_publish_date,
  video_thumbnail, channel_url, audio_file_name, audio_file_size,
  transcription_processing_time, transcription_token_count, transcription_cost,
  llm_processing_time, llm_input_token_count,
  llm_output_token_count, llm_cost, selected_prompts,
  tts_enabled, tts_service, tts_model, tts_voice, tts_audio_file,
  tts_processing_time, tts_audio_duration, tts_cost,
  image_gen_enabled, image_gen_service, image_gen_model, images_generated,
  image_gen_processing_time, image_gen_cost, selected_image_prompts, image_files,
  music_gen_enabled, music_gen_service, music_gen_model, music_gen_genre, music_gen_preset, music_gen_target_duration, music_gen_instrumental, music_gen_sample_rate, music_gen_bitrate, music_gen_file,
  music_gen_processing_time, music_gen_duration, music_gen_cost, music_gen_lyrics_length, music_gen_lyrics_generation_time, music_gen_lyrics,
  video_gen_enabled, video_gen_service, video_gen_model, videos_generated,
  video_gen_processing_time, video_gen_cost, selected_video_prompts, video_size, video_duration, video_files,
  document_backup_url, document_backup_key, document_backup_uploaded_at,
  input_type, audio_s3_url, tts_s3_url, image_s3_urls, music_s3_url, video_s3_urls, thumbnail_s3_url
`

function getResultShape(value: unknown): Record<string, unknown> {
  if (value === null) {
    return { type: "null" }
  }

  if (Array.isArray(value)) {
    return { type: "array" }
  }

  if (typeof value !== "object") {
    return { type: typeof value }
  }

  return {
    type: "object",
    constructorName: value.constructor?.name ?? "unknown",
    hasNumericLength: typeof (value as { length?: unknown }).length === "number",
  }
}

function getShowNoteRows(rawRows: unknown): unknown[] {
  if (Array.isArray(rawRows)) {
    return rawRows
  }

  err("Show notes query returned non-array rows", {
    query: "getRecentShowNotes",
    resultShape: getResultShape(rawRows),
  })

  throw new Error("Invalid show notes query result")
}

function parseShowNoteRows(rows: readonly unknown[]): ShowNote[] {
  return Array.from(rows, row => {
    const result = v.safeParse(ShowNoteSchema, row)
    if (!result.success) {
      throw new Error('Invalid show note data in database')
    }
    return result.output
  })
}

async function getRecentShowNotes(db: SQL, limit: number = 20): Promise<ShowNote[]> {
  try {
    const rawRows = await db.unsafe(
      `SELECT ${SHOW_NOTES_SELECT_COLUMNS} FROM show_notes WHERE deleted_at IS NULL ORDER BY processed_at DESC LIMIT ?`,
      [limit]
    )

    return parseShowNoteRows(getShowNoteRows(rawRows))
  } catch (error) {
    throw error
  }
}

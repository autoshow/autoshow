import type { SQL } from "bun"
import { ShowNoteSchema,validateOrThrow } from "~/types"
import { getShowNoteAssets } from "./show-note-assets"

const SHOW_NOTE_SELECT_COLUMNS = `
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

export async function getShowNoteForViewer(
  db: SQL,
  id: string
) {
  const rows = await db.unsafe(
    `SELECT ${SHOW_NOTE_SELECT_COLUMNS} FROM show_notes WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id]
  )

  const row = rows[0]
  if (!row) {
    return null
  }

  const note = validateOrThrow(ShowNoteSchema, row, 'Invalid show note data in database')
  const assets = await getShowNoteAssets(db, note.id)
  return { note, assets }
}

export async function getShowNoteById(
  db: SQL,
  id: string
) {
  const rows = await db.unsafe(
    `SELECT ${SHOW_NOTE_SELECT_COLUMNS}
     FROM show_notes
     WHERE id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [id]
  )

  const row = rows[0]
  if (!row) {
    return null
  }

  return validateOrThrow(ShowNoteSchema, row, 'Invalid show note data in database')
}

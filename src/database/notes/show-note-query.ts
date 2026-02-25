import { l, err } from "~/utils/logging"
import type { SQL } from "bun"
import { ShowNoteSchema, validateOrThrow, type ShowNote } from "~/types"
import { query } from "@solidjs/router"
import { getDatabase, initializeSchema } from "~/database/db"
import { normalizeShowNoteRow } from "./normalize-show-note-row"

export const getShowNote = query(async (id: string) => {
  "use server"
  try {
    const db = getDatabase()
    await initializeSchema(db)
    const showNote = await getShowNoteById(db, id)
    if (!showNote) {
      throw new Error("Show note not found")
    }
    return showNote
  } catch (error) {
    err(`Failed to fetch show note: ${id}`, error)
    throw error
  }
}, "show-note")

export const getShowNoteById = async (db: SQL, id: string): Promise<ShowNote | null> => {
  try {
    const rows = await db`
      SELECT
        id, url, title, author, duration, prompt, text_output,
        transcription, transcription_service, transcription_model,
        document_service, document_model,
        llm_service, llm_model, processed_at, created_at, video_publish_date,
        video_thumbnail, channel_url, audio_file_name, audio_file_size,
        transcription_processing_time, transcription_token_count,
        llm_processing_time, llm_input_token_count,
        llm_output_token_count, selected_prompts,
        tts_enabled, tts_service, tts_model, tts_voice, tts_audio_file,
        tts_processing_time, tts_audio_duration,
        image_gen_enabled, image_gen_service, image_gen_model, images_generated,
        image_gen_processing_time, image_gen_cost, selected_image_prompts, image_files,
        music_gen_enabled, music_gen_service, music_gen_model, music_gen_genre, music_gen_preset, music_gen_target_duration, music_gen_instrumental, music_gen_sample_rate, music_gen_bitrate, music_gen_file,
        music_gen_processing_time, music_gen_duration, music_gen_cost, music_gen_lyrics_length, music_gen_lyrics_generation_time, music_gen_lyrics,
        video_gen_enabled, video_gen_service, video_gen_model, videos_generated,
        video_gen_processing_time, video_gen_cost, selected_video_prompts, video_size, video_duration, video_files
      FROM show_notes
      WHERE id = ${id}
    `

    const row = rows[0] as Record<string, unknown> | undefined

    if (!row) {
      l(`Show note not found: ${id}`)
      return null
    }

    const normalizedRow = normalizeShowNoteRow(row)
    return validateOrThrow(ShowNoteSchema, normalizedRow, 'Invalid show note data in database')
  } catch (error) {
    err('Failed to fetch show note by ID', error)
    throw error
  }
}

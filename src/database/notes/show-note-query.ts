import { l, err } from "~/utils/logging"
import type { Database } from "bun:sqlite"
import type { ShowNote } from "~/types/main"
import { ShowNoteSchema, validateOrThrow } from "~/types/main"
import { query } from "@solidjs/router"
import { getDatabase, initializeSchema } from "~/database/db"

export const getShowNote = query(async (id: string) => {
  "use server"
  try {
    const db = getDatabase()
    initializeSchema(db)
    const showNote = getShowNoteById(db, id)
    if (!showNote) {
      throw new Error("Show note not found")
    }
    return showNote
  } catch (error) {
    err(`Failed to fetch show note: ${id}`, error)
    throw error
  }
}, "show-note")

export const getShowNoteById = (db: Database, id: string): ShowNote | null => {
  try {
    const query = db.query(`
      SELECT 
        id, url, title, author, duration, prompt, summary,
        transcription, transcription_service, transcription_model,
        llm_service, llm_model, processed_at, created_at, video_publish_date,
        video_thumbnail, channel_url, audio_file_name, audio_file_size,
        transcription_processing_time, transcription_token_count,
        llm_processing_time, llm_input_token_count,
        llm_output_token_count, selected_prompts,
        tts_enabled, tts_service, tts_model, tts_voice, tts_audio_file,
        tts_processing_time, tts_audio_duration,
        image_gen_enabled, image_gen_service, image_gen_model, images_generated,
        image_gen_processing_time, selected_image_prompts, image_files,
        music_gen_enabled, music_gen_service, music_gen_model, music_gen_genre, music_gen_file,
        music_gen_processing_time, music_gen_duration, music_gen_lyrics_length, music_gen_lyrics_generation_time, music_gen_lyrics,
        video_gen_enabled, video_gen_service, video_gen_model, videos_generated,
        video_gen_processing_time, selected_video_prompts, video_size, video_duration, video_files
      FROM show_notes
      WHERE id = $id
    `)
    
    const row = query.get({ id })
    
    if (!row) {
      l(`Show note not found: ${id}`)
      return null
    }
    
    return validateOrThrow(ShowNoteSchema, row, 'Invalid show note data in database')
  } catch (error) {
    err('Failed to fetch show note by ID', error)
    throw error
  }
}
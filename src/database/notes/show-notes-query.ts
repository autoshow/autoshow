import * as v from 'valibot'
import { l, err } from "~/utils/logging"
import type { SQL } from "bun"
import { ShowNoteSchema, type ShowNote } from "~/types"
import { query } from "@solidjs/router"
import { getDatabase, initializeSchema } from "~/database/db"
import { normalizeShowNoteRow } from "./normalize-show-note-row"

export const getShowNotes = query(async () => {
  "use server"
  try {
    const db = getDatabase()
    await initializeSchema(db)
    const showNotes = await getRecentShowNotes(db, 20)
    return showNotes
  } catch (error) {
    err("Failed to fetch show notes", error)
    throw error
  }
}, "show-notes")

export const getRecentShowNotes = async (db: SQL, limit: number = 20): Promise<ShowNote[]> => {
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
      ORDER BY processed_at DESC
      LIMIT ${limit}
    `

    const results: ShowNote[] = (rows as unknown[]).map(row => {
      const normalizedRow = normalizeShowNoteRow(row as Record<string, unknown>)
      const result = v.safeParse(ShowNoteSchema, normalizedRow)
      if (!result.success) {
        err('Invalid show note data in database', { issues: v.flatten(result.issues) })
        throw new Error('Invalid show note data in database')
      }
      return result.output
    })

    const notesWithVideo = results.filter(r => r.video_gen_enabled === true)
    if (notesWithVideo.length > 0) {
      l('Retrieved show notes with video metadata', {
        totalNotes: results.length,
        notesWithVideo: notesWithVideo.length,
        videoDetails: notesWithVideo.map(n => ({
          id: n.id,
          videoFiles: n.video_files,
          videosGenerated: n.videos_generated
        }))
      })
    }

    return results
  } catch (error) {
    err('Failed to fetch recent show notes', error)
    throw error
  }
}

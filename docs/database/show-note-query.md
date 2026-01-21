# Show Note Query (Single Record)

> `src/database/show-note-query.ts`

## `getShowNote(id)` - SolidJS Query

Server-side query wrapper for SolidJS routes.

```typescript
export const getShowNote = query(async (id: string) => {
  "use server"
  const db = getDatabase()
  initializeSchema(db)
  const showNote = getShowNoteById(db, id)
  if (!showNote) {
    throw new Error("Show note not found")
  }
  return showNote
}, "show-note")
```

## `getShowNoteById(db, id)` - Direct Query

```typescript
getShowNoteById(db: Database, id: string): ShowNote | null
```

Executes:
```sql
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
```

Returns `ShowNote | null` with all 55 fields.

---

## Route Integration

```typescript
// Single show route
export const route = {
  load: ({ params }) => getShowNote(params.id)
}
```

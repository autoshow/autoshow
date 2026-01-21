# Show Notes Query (List Records)

> `src/database/show-notes-query.ts`

## `getShowNotes()` - SolidJS Query

Server-side query wrapper for SolidJS routes.

```typescript
export const getShowNotes = query(async () => {
  "use server"
  const db = getDatabase()
  initializeSchema(db)
  return getRecentShowNotes(db, 20)
}, "show-notes")
```

## `getRecentShowNotes(db, limit)` - Direct Query

```typescript
getRecentShowNotes(db: Database, limit: number = 20): ShowNote[]
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
ORDER BY processed_at DESC
LIMIT $limit
```

Returns `ShowNote[]` with all fields, ordered by most recently processed first.

---

## Route Integration

```typescript
// Show list route
export const route = {
  load: () => getShowNotes()
}
```

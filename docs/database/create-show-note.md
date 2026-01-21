# Create Show Note

> `src/database/create-show-note.ts`

## `createShowNote(db, id, input)`

Inserts a new show note record into the database.

### Transform Logic

```typescript
// Array to CSV
selectedPrompts: input.selectedPrompts.join(',')
selectedImagePrompts: input.metadata?.step6?.selectedPrompts.join(',') ?? null
selectedVideoPrompts: input.metadata?.step8?.selectedPrompts.join(',') ?? null

// Nested array to CSV
imageFiles = input.metadata?.step6?.results.map(r => r.fileName).join(',') || null
videoFiles = input.metadata?.step8?.results.map(r => r.fileName).join(',') || null

// Boolean to integer
ttsEnabled: input.metadata?.step5 ? 1 : 0
imageGenEnabled: input.metadata?.step6 ? 1 : 0
musicGenEnabled: input.metadata?.step7 ? 1 : 0
videoGenEnabled: input.metadata?.step8 ? 1 : 0

// Metadata extraction
videoPublishDate: input.metadata?.step1.videoPublishDate ?? null
audioFileName: input.metadata?.step1.audioFileName ?? null
transcriptionProcessingTime: input.metadata?.step2.processingTime ?? null
llmProcessingTime: input.metadata?.step4?.processingTime ?? null
ttsAudioFile: input.metadata?.step5?.audioFileName ?? null
imagesGenerated: input.metadata?.step6?.imagesGenerated ?? null
musicGenFile: input.metadata?.step7?.musicFileName ?? null
videosGenerated: input.metadata?.step8?.videosGenerated ?? null
videoSize: input.metadata?.step8?.selectedSize ?? null
videoDuration: input.metadata?.step8?.selectedDuration ?? null
```

### Input: `ShowNoteInput`

```typescript
{
  url: string
  title: string
  author?: string
  duration?: string
  prompt: string
  summary: string
  transcription: string
  transcriptionService: 'groq' | 'deepinfra' | 'happyscribe'
  transcriptionModel?: string
  llmService: 'openai' | 'anthropic' | 'gemini'
  llmModel?: string
  processedAt: number
  metadata?: ProcessingMetadata
  selectedPrompts: string[]
}
```

### Processing Metadata Structure

```typescript
{
  step1: {
    videoUrl: string
    videoTitle: string
    videoPublishDate?: string
    videoThumbnail?: string
    channelTitle: string
    channelUrl?: string
    duration: string
    audioFileName: string
    audioFileSize: number
  }
  step2: {
    transcriptionService: 'groq' | 'deepinfra' | 'happyscribe'
    transcriptionModel: string
    processingTime: number
    tokenCount: number
  }
  step3: { selectedPrompts: string[] }
  step4: {
  llmService: 'openai' | 'anthropic' | 'gemini'
    llmModel: string
    processingTime: number
    inputTokenCount: number
    outputTokenCount: number
  }
  step5?: {
    ttsService: 'openai' | 'elevenlabs'
    ttsModel: string
    ttsVoice: string
    processingTime: number
    audioFileName: string
    audioFileSize: number
    audioDuration: number
    inputTextLength: number
  }
  step6?: {
    imageGenService: 'openai'
    imageGenModel: string
    processingTime: number
    imagesGenerated: number
    selectedPrompts: string[]
    results: { promptType, fileName, fileSize, processingTime, revisedPrompt? }[]
  }
  step7?: {
    musicService: 'elevenlabs'
    musicModel: string
    selectedGenre: 'rap' | 'rock' | 'pop' | 'country' | 'folk' | 'jazz'
    processingTime: number
    musicFileName: string
    musicFileSize: number
    musicDuration: number
    lyricsLength: number
    lyricsGenerationTime: number
    lyricsText: string
  }
  step8?: {
    videoGenService: 'openai'
    videoGenModel: 'sora-2' | 'sora-2-pro'
    processingTime: number
    videosGenerated: number
    selectedPrompts: string[]
    selectedSize: '1920x1080' | '1080x1920' | '1280x720' | '720x1280'
    selectedDuration: number
    results: { promptType, fileName, fileSize, processingTime, duration, size, thumbnailFileName?, scenePrompt?, scenePromptGenerationTime? }[]
  }
}
```

---

## `saveResults(showNoteId, metadata, options, processingMetadata, promptInstructions)`

Helper function called after processing pipeline completes.

### Flow

1. Validate `step4.llmService` and `step2.transcriptionModel` exist
2. Initialize database and schema via `getDatabase()` and `initializeSchema(db)`
3. Build file paths:
   - Summary: `${options.outputDir}/summary.md`
   - Transcription: `${options.outputDir}/transcription.txt` or `transcription-happyscribe.txt` (based on `options.transcriptionService`)
4. Check file existence with `Bun.$\`test -e ${path}\`.quiet().nothrow()`
5. Read files with `Bun.file(path).text()`
6. Call `createShowNote()` with combined data from metadata, options, and file contents

### Integration

```typescript
// After all steps complete
await saveResults(showNoteId, metadata, options, processingMetadata, promptInstructions)
```

---

## Type Mappings

```
ShowNoteInput (TypeScript)       Database Column
─────────────────────────        ──────────────────
url                       →      url
title                     →      title
author                    →      author
duration                  →      duration
prompt                    →      prompt
summary                   →      summary
transcription             →      transcription
transcriptionService      →      transcription_service
transcriptionModel        →      transcription_model
llmService                →      llm_service
llmModel                  →      llm_model
processedAt               →      processed_at
selectedPrompts[]         →      selected_prompts (CSV)

metadata.step1.*          →      video_*, channel_*, audio_*
metadata.step2.*          →      transcription_processing_time, transcription_token_count
metadata.step4.*          →      llm_processing_time, llm_*_token_count
metadata.step5.*          →      tts_*
metadata.step6.*          →      image_gen_*, selected_image_prompts (CSV), image_files (CSV)
metadata.step7.*          →      music_gen_*
metadata.step8.*          →      video_gen_*, selected_video_prompts (CSV), video_files (CSV)
```

## Implementation Notes

- **CSV Fields:** `selected_prompts`, `selected_image_prompts`, `image_files`, `selected_video_prompts`, `video_files`
- **Boolean as Integer:** `tts_enabled`, `image_gen_enabled`, `music_gen_enabled`, `video_gen_enabled`
- **Optional Steps:** Steps 5-8 fields nullable when features disabled
- **Error Handling:** Throws on missing `llmService`, `transcriptionModel`, or required files

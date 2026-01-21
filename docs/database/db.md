# Database Connection and Schema

> `src/database/db.ts`

## Connection

```typescript
getDatabase(): Database
```

- Singleton pattern with lazy initialization
- Path: `process.env.DATABASE_PATH || "./data/autoshow.db"`
- Creates parent directories via `mkdir -p`
- Pragmas:
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  ```

## Schema Initialization

```typescript
initializeSchema(db: Database): void
```

Creates `show_notes` table, `jobs` table, and indexes if not exists.

---

## Schema: `show_notes`

```sql
CREATE TABLE show_notes (
  -- Core
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  duration TEXT,
  prompt TEXT NOT NULL,
  summary TEXT NOT NULL,
  transcription TEXT NOT NULL,
  processed_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  
  -- Video metadata
  video_publish_date TEXT,
  video_thumbnail TEXT,
  channel_url TEXT,
  
  -- Audio
  audio_file_name TEXT,
  audio_file_size INTEGER,
  
  -- Transcription
  transcription_service TEXT NOT NULL CHECK(transcription_service IN ('groq', 'deepinfra', 'happyscribe')),
  transcription_model TEXT,
  transcription_processing_time INTEGER,
  transcription_token_count INTEGER,
  
  -- LLM
  llm_service TEXT NOT NULL CHECK(llm_service IN ('openai', 'anthropic', 'gemini')),
  llm_model TEXT,
  llm_processing_time INTEGER,
  llm_input_token_count INTEGER,
  llm_output_token_count INTEGER,
  selected_prompts TEXT,
  
  -- TTS (optional)
  tts_enabled INTEGER DEFAULT 0,
  tts_service TEXT CHECK(tts_service IN ('openai', 'elevenlabs')),
  tts_model TEXT,
  tts_voice TEXT,
  tts_audio_file TEXT,
  tts_processing_time INTEGER,
  tts_audio_duration REAL,
  
  -- Image Gen (optional)
  image_gen_enabled INTEGER DEFAULT 0,
  image_gen_service TEXT CHECK(image_gen_service IN ('openai')),
  image_gen_model TEXT,
  images_generated INTEGER,
  image_gen_processing_time INTEGER,
  selected_image_prompts TEXT,
  image_files TEXT,
  
  -- Music Gen (optional)
  music_gen_enabled INTEGER DEFAULT 0,
  music_gen_service TEXT CHECK(music_gen_service IN ('elevenlabs')),
  music_gen_model TEXT,
  music_gen_genre TEXT CHECK(music_gen_genre IN ('rap', 'rock', 'pop', 'country', 'folk', 'jazz')),
  music_gen_file TEXT,
  music_gen_processing_time INTEGER,
  music_gen_duration REAL,
  music_gen_lyrics_length INTEGER,
  music_gen_lyrics_generation_time INTEGER,
  music_gen_lyrics TEXT,
  
  -- Video Gen (optional)
  video_gen_enabled INTEGER DEFAULT 0,
  video_gen_service TEXT CHECK(video_gen_service IN ('openai')),
  video_gen_model TEXT CHECK(video_gen_model IN ('sora-2', 'sora-2-pro')),
  videos_generated INTEGER,
  video_gen_processing_time INTEGER,
  selected_video_prompts TEXT,
  video_size TEXT,
  video_duration INTEGER,
  video_files TEXT
);

CREATE INDEX idx_show_notes_processed_at ON show_notes(processed_at DESC);
```

## Schema: `jobs`

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'error')),
  current_step INTEGER DEFAULT 0,
  step_name TEXT,
  step_progress INTEGER DEFAULT 0,
  overall_progress INTEGER DEFAULT 0,
  message TEXT,
  error TEXT,
  show_note_id TEXT,
  input_data TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  started_at INTEGER,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (show_note_id) REFERENCES show_notes(id)
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
```

---

## Implementation Notes

- **Timestamps:** Unix milliseconds (JavaScript `Date.now()`)
- **WAL Mode:** Enables concurrent reads during writes
- **Indexes:** 
  - `idx_show_notes_processed_at` - Optimized for `processed_at DESC` queries
  - `idx_jobs_status` - For filtering jobs by status
  - `idx_jobs_created_at` - For ordering jobs by creation time

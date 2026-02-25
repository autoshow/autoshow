import { SQL } from "bun"
import { mkdirSync } from "node:fs"
import { dirname, isAbsolute, resolve } from "node:path"
import { l, err } from "~/utils/logging"
import { MUSIC_CONFIG } from "~/models/music-config"

let sql: SQL | null = null
let initialized = false

const DEFAULT_DATABASE_URL = "sqlite://./data/autoshow.db"
const LEGACY_POSTGRES_DATABASE_URLS = new Set([
  "postgres://localhost:5432/autoshow",
  "postgres://autoshow:autoshow@localhost:5432/autoshow"
])
const MUSIC_SERVICE_CHECK = (Object.keys(MUSIC_CONFIG)).map(service => `'${service}'`).join(', ')
const SQLITE_PREFIXES = ['sqlite://', 'sqlite:', 'file://', 'file:'] as const

const isSqliteDatabase = (dbUrl: string): boolean =>
  dbUrl === ':memory:' || SQLITE_PREFIXES.some(prefix => dbUrl.startsWith(prefix))

const maskDatabaseUrl = (dbUrl: string): string => dbUrl.replace(/:[^:@]+@/, ':***@')

const resolveDatabaseUrl = (): string => {
  const configuredUrl = process.env["DATABASE_URL"]?.trim()
  if (!configuredUrl) return DEFAULT_DATABASE_URL

  if (LEGACY_POSTGRES_DATABASE_URLS.has(configuredUrl)) {
    l(`Legacy PostgreSQL DATABASE_URL detected (${maskDatabaseUrl(configuredUrl)}). Using ${DEFAULT_DATABASE_URL}.`)
    return DEFAULT_DATABASE_URL
  }

  return configuredUrl
}

const normalizeSqlitePath = (rawPath: string): string | null => {
  const path = rawPath.split('?')[0]?.split('#')[0] ?? ''
  if (!path || path === ':memory:' || path === '/:memory:') {
    return null
  }

  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

const getSqliteFilePath = (dbUrl: string): string | null => {
  if (dbUrl.startsWith('sqlite://')) return normalizeSqlitePath(dbUrl.slice('sqlite://'.length))
  if (dbUrl.startsWith('sqlite:')) return normalizeSqlitePath(dbUrl.slice('sqlite:'.length))
  if (dbUrl.startsWith('file://')) return normalizeSqlitePath(dbUrl.slice('file://'.length))
  if (dbUrl.startsWith('file:')) return normalizeSqlitePath(dbUrl.slice('file:'.length))
  if (dbUrl === ':memory:') return null
  return null
}

const ensureSqliteDirectoryExists = (dbUrl: string): void => {
  if (!isSqliteDatabase(dbUrl)) return

  const sqliteFilePath = getSqliteFilePath(dbUrl)
  if (!sqliteFilePath) return

  const absolutePath = isAbsolute(sqliteFilePath)
    ? sqliteFilePath
    : resolve(process.cwd(), sqliteFilePath)

  mkdirSync(dirname(absolutePath), { recursive: true })
}

export const getDatabase = (): SQL => {
  if (!sql) {
    const dbUrl = resolveDatabaseUrl()

    try {
      if (!isSqliteDatabase(dbUrl)) {
        throw new Error(
          `DATABASE_URL must be a SQLite URL (:memory:, sqlite://..., or file://...). Received: ${maskDatabaseUrl(dbUrl)}`
        )
      }

      ensureSqliteDirectoryExists(dbUrl)
      sql = new SQL(dbUrl)
      l(`Database initialized at ${maskDatabaseUrl(dbUrl)}`)
    } catch (error) {
      err('Failed to initialize database', error)
      throw error
    }
  }

  return sql
}

const migrateShowNotesForRemovedProviders = async (db: SQL): Promise<void> => {
  const rows = await db`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'show_notes'` as Array<{ sql: string | null }>
  const schemaSql = rows[0]?.sql ?? ''
  if (!schemaSql) return

  const needsMigration =
    schemaSql.includes("'lemonfox'") ||
    schemaSql.includes("'deapi'") ||
    schemaSql.includes("'supadata'") ||
    schemaSql.includes("'runway'") ||
    schemaSql.includes("'flux'")

  if (!needsMigration) return

  l('Migrating show_notes schema to remove deprecated providers')

  await db`PRAGMA foreign_keys = OFF`
  try {
    await db.unsafe(`
      DROP TABLE IF EXISTS show_notes__migration;

      CREATE TABLE show_notes__migration (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        duration TEXT,
        prompt TEXT NOT NULL,
        text_output TEXT NOT NULL,
        transcription TEXT NOT NULL,
        transcription_service TEXT CHECK(transcription_service IN ('groq', 'deepinfra', 'happyscribe', 'fal', 'gladia', 'elevenlabs', 'rev', 'assembly', 'deepgram', 'soniox')),
        transcription_model TEXT,
        document_service TEXT CHECK(document_service IN ('llamaparse', 'mistral-ocr')),
        document_model TEXT,
        llm_service TEXT NOT NULL CHECK(llm_service IN ('openai', 'claude', 'gemini', 'minimax', 'grok', 'groq')),
        llm_model TEXT,
        processed_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL,
        video_publish_date TEXT,
        video_thumbnail TEXT,
        channel_url TEXT,
        audio_file_name TEXT,
        audio_file_size BIGINT,
        transcription_processing_time BIGINT,
        transcription_token_count BIGINT,
        llm_processing_time BIGINT,
        llm_input_token_count BIGINT,
        llm_output_token_count BIGINT,
        selected_prompts TEXT,
        tts_enabled BOOLEAN DEFAULT FALSE,
        tts_service TEXT CHECK(tts_service IN ('openai', 'elevenlabs', 'groq')),
        tts_model TEXT,
        tts_voice TEXT,
        tts_audio_file TEXT,
        tts_processing_time BIGINT,
        tts_audio_duration REAL,
        image_gen_enabled BOOLEAN DEFAULT FALSE,
        image_gen_service TEXT CHECK(image_gen_service IN ('openai', 'gemini', 'minimax', 'grok')),
        image_gen_model TEXT,
        images_generated INTEGER,
        image_gen_processing_time BIGINT,
        image_gen_cost REAL,
        selected_image_prompts TEXT,
        image_files TEXT,
        provider_job_id TEXT,
        provider_poll_url TEXT,
        image_width INTEGER,
        image_height INTEGER,
        music_gen_enabled BOOLEAN DEFAULT FALSE,
        music_gen_service TEXT CHECK(music_gen_service IN (${MUSIC_SERVICE_CHECK})),
        music_gen_model TEXT,
        music_gen_genre TEXT CHECK(music_gen_genre IN ('rap', 'rock', 'pop', 'country', 'folk', 'jazz', 'electronic')),
        music_gen_preset TEXT CHECK(music_gen_preset IN ('cheap', 'balanced', 'quality')),
        music_gen_target_duration INTEGER,
        music_gen_instrumental BOOLEAN,
        music_gen_sample_rate INTEGER CHECK(music_gen_sample_rate IS NULL OR music_gen_sample_rate IN (16000, 24000, 32000, 44100)),
        music_gen_bitrate INTEGER CHECK(music_gen_bitrate IS NULL OR music_gen_bitrate IN (32000, 64000, 128000, 256000)),
        music_gen_file TEXT,
        music_gen_processing_time BIGINT,
        music_gen_duration REAL,
        music_gen_cost REAL,
        music_gen_lyrics_length INTEGER,
        music_gen_lyrics_generation_time BIGINT,
        music_gen_lyrics TEXT,
        video_gen_enabled BOOLEAN DEFAULT FALSE,
        video_gen_service TEXT CHECK(video_gen_service IN ('openai', 'gemini', 'minimax', 'grok')),
        video_gen_model TEXT CHECK(video_gen_model IN ('sora-2', 'sora-2-pro', 'veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview', 'MiniMax-Hailuo-2.3', 'MiniMax-Hailuo-02', 'T2V-01-Director', 'T2V-01', 'grok-imagine-video')),
        videos_generated INTEGER,
        video_gen_processing_time BIGINT,
        video_gen_cost REAL,
        selected_video_prompts TEXT,
        video_size TEXT,
        video_duration INTEGER,
        video_files TEXT,
        document_backup_url TEXT,
        document_backup_key TEXT,
        document_backup_uploaded_at BIGINT,
        document_page_count INTEGER,
        document_type TEXT CHECK(document_type IS NULL OR document_type IN ('pdf', 'docx', 'pptx')),
        input_type TEXT CHECK(input_type IS NULL OR input_type IN ('audio-video', 'document')) DEFAULT 'audio-video',
        audio_s3_url TEXT,
        tts_s3_url TEXT,
        image_s3_urls TEXT,
        music_s3_url TEXT,
        video_s3_urls TEXT,
        thumbnail_s3_url TEXT
      );

      INSERT INTO show_notes__migration
      SELECT *
      FROM show_notes
      WHERE COALESCE(transcription_service, '') NOT IN ('lemonfox', 'deapi', 'supadata')
        AND COALESCE(image_gen_service, '') != 'flux'
        AND COALESCE(video_gen_service, '') != 'runway'
        AND (video_gen_model IS NULL OR video_gen_model NOT IN ('veo3.1', 'veo3.1_fast', 'veo3'));

      DROP INDEX IF EXISTS idx_show_notes_processed_at;
      DROP TABLE show_notes;
      ALTER TABLE show_notes__migration RENAME TO show_notes;
      CREATE INDEX IF NOT EXISTS idx_show_notes_processed_at ON show_notes(processed_at DESC);

      UPDATE jobs
      SET show_note_id = NULL
      WHERE show_note_id IS NOT NULL
        AND show_note_id NOT IN (SELECT id FROM show_notes);
    `)
  } finally {
    await db`PRAGMA foreign_keys = ON`
  }

  l('show_notes migration complete')
}

export const initializeSchema = async (db: SQL): Promise<void> => {
  if (initialized) return

  try {
    await db`PRAGMA foreign_keys = ON`
    await db`PRAGMA journal_mode = WAL`
    await db`PRAGMA busy_timeout = 5000`

    await db.unsafe(`
      CREATE TABLE IF NOT EXISTS show_notes (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        duration TEXT,
        prompt TEXT NOT NULL,
        text_output TEXT NOT NULL,
        transcription TEXT NOT NULL,
        transcription_service TEXT CHECK(transcription_service IN ('groq', 'deepinfra', 'happyscribe', 'fal', 'gladia', 'elevenlabs', 'rev', 'assembly', 'deepgram', 'soniox')),
        transcription_model TEXT,
        document_service TEXT CHECK(document_service IN ('llamaparse', 'mistral-ocr')),
        document_model TEXT,
        llm_service TEXT NOT NULL CHECK(llm_service IN ('openai', 'claude', 'gemini', 'minimax', 'grok', 'groq')),
        llm_model TEXT,
        processed_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL,
        video_publish_date TEXT,
        video_thumbnail TEXT,
        channel_url TEXT,
        audio_file_name TEXT,
        audio_file_size BIGINT,
        transcription_processing_time BIGINT,
        transcription_token_count BIGINT,
        llm_processing_time BIGINT,
        llm_input_token_count BIGINT,
        llm_output_token_count BIGINT,
        selected_prompts TEXT,
        tts_enabled BOOLEAN DEFAULT FALSE,
        tts_service TEXT CHECK(tts_service IN ('openai', 'elevenlabs', 'groq')),
        tts_model TEXT,
        tts_voice TEXT,
        tts_audio_file TEXT,
        tts_processing_time BIGINT,
        tts_audio_duration REAL,
        image_gen_enabled BOOLEAN DEFAULT FALSE,
        image_gen_service TEXT CHECK(image_gen_service IN ('openai', 'gemini', 'minimax', 'grok')),
        image_gen_model TEXT,
        images_generated INTEGER,
        image_gen_processing_time BIGINT,
        image_gen_cost REAL,
        selected_image_prompts TEXT,
        image_files TEXT,
        provider_job_id TEXT,
        provider_poll_url TEXT,
        image_width INTEGER,
        image_height INTEGER,
        music_gen_enabled BOOLEAN DEFAULT FALSE,
        music_gen_service TEXT CHECK(music_gen_service IN (${MUSIC_SERVICE_CHECK})),
        music_gen_model TEXT,
        music_gen_genre TEXT CHECK(music_gen_genre IN ('rap', 'rock', 'pop', 'country', 'folk', 'jazz', 'electronic')),
        music_gen_preset TEXT CHECK(music_gen_preset IN ('cheap', 'balanced', 'quality')),
        music_gen_target_duration INTEGER,
        music_gen_instrumental BOOLEAN,
        music_gen_sample_rate INTEGER CHECK(music_gen_sample_rate IS NULL OR music_gen_sample_rate IN (16000, 24000, 32000, 44100)),
        music_gen_bitrate INTEGER CHECK(music_gen_bitrate IS NULL OR music_gen_bitrate IN (32000, 64000, 128000, 256000)),
        music_gen_file TEXT,
        music_gen_processing_time BIGINT,
        music_gen_duration REAL,
        music_gen_cost REAL,
        music_gen_lyrics_length INTEGER,
        music_gen_lyrics_generation_time BIGINT,
        music_gen_lyrics TEXT,
        video_gen_enabled BOOLEAN DEFAULT FALSE,
        video_gen_service TEXT CHECK(video_gen_service IN ('openai', 'gemini', 'minimax', 'grok')),
        video_gen_model TEXT CHECK(video_gen_model IN ('sora-2', 'sora-2-pro', 'veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview', 'MiniMax-Hailuo-2.3', 'MiniMax-Hailuo-02', 'T2V-01-Director', 'T2V-01', 'grok-imagine-video')),
        videos_generated INTEGER,
        video_gen_processing_time BIGINT,
        video_gen_cost REAL,
        selected_video_prompts TEXT,
        video_size TEXT,
        video_duration INTEGER,
        video_files TEXT,
        document_backup_url TEXT,
        document_backup_key TEXT,
        document_backup_uploaded_at BIGINT,
        document_page_count INTEGER,
        document_type TEXT CHECK(document_type IS NULL OR document_type IN ('pdf', 'docx', 'pptx')),
        input_type TEXT CHECK(input_type IS NULL OR input_type IN ('audio-video', 'document')) DEFAULT 'audio-video',
        audio_s3_url TEXT,
        tts_s3_url TEXT,
        image_s3_urls TEXT,
        music_s3_url TEXT,
        video_s3_urls TEXT,
        thumbnail_s3_url TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_show_notes_processed_at
      ON show_notes(processed_at DESC);

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'error')),
        current_step INTEGER DEFAULT 0,
        step_name TEXT,
        step_progress INTEGER DEFAULT 0,
        overall_progress INTEGER DEFAULT 0,
        message TEXT,
        error TEXT,
        show_note_id TEXT REFERENCES show_notes(id),
        input_data TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        started_at BIGINT,
        completed_at BIGINT,
        updated_at BIGINT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

    `)

    await migrateShowNotesForRemovedProviders(db)

    initialized = true
  } catch (error) {
    err('Failed to initialize schema', error)
    throw error
  }
}

import { SQL } from "bun"
import { mkdirSync } from "node:fs"
import { IMAGE_CONFIG } from "~/models/models-config/image-config"
import { LLM_CONFIG } from "~/models/models-config/llm-config"
import { MUSIC_CONFIG } from "~/models/models-config/music-config"
import { TRANSCRIPTION_CONFIG } from "~/models/models-config/transcription-config"
import { TTS_CONFIG } from "~/models/models-config/tts-config"
import { err } from "~/utils/logger/logging"

let sql: SQL | null = null
let schemaInitialized = false
let schemaInitializationPromise: Promise<void> | null = null

const TRANSCRIPTION_SERVICE_IDS = Object.values(TRANSCRIPTION_CONFIG)
  .flatMap(group => Object.keys(group))
  .filter((service, index, services) => services.indexOf(service) === index)
const TRANSCRIPTION_SERVICE_CHECK = TRANSCRIPTION_SERVICE_IDS
  .map(service => `'${service}'`)
  .join(', ')
const LLM_SERVICE_CHECK = Object.keys(LLM_CONFIG).map(service => `'${service}'`).join(', ')
const TTS_SERVICE_CHECK = Object.keys(TTS_CONFIG).map(service => `'${service}'`).join(', ')
const IMAGE_SERVICE_CHECK = Object.keys(IMAGE_CONFIG).map(service => `'${service}'`).join(', ')
const MUSIC_SERVICE_CHECK = Object.keys(MUSIC_CONFIG).map(service => `'${service}'`).join(', ')
const DOCUMENT_SERVICE_CHECK = "'mistral-ocr', 'glm', 'openai', 'claude', 'gemini', 'grok', 'deapi'"
const DOCUMENT_TYPE_CHECK = "'pdf', 'png', 'jpg', 'tiff', 'txt', 'docx', 'pptx', 'xlsx'"
const SHOW_NOTES_COLUMN_DEFINITIONS = `
        id TEXT PRIMARY KEY,
        total_cost_usd REAL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        duration TEXT,
        prompt TEXT,
        text_output TEXT,
        transcription TEXT NOT NULL,
        transcription_service TEXT CHECK(transcription_service IN (${TRANSCRIPTION_SERVICE_CHECK})),
        transcription_model TEXT,
        document_service TEXT CHECK(document_service IN (${DOCUMENT_SERVICE_CHECK})),
        document_model TEXT,
        document_type TEXT CHECK(document_type IS NULL OR document_type IN (${DOCUMENT_TYPE_CHECK})),
        document_page_count INTEGER,
        document_processing_time BIGINT,
        document_character_count BIGINT,
        document_input_token_count BIGINT,
        document_output_token_count BIGINT,
        document_cost REAL,
        llm_service TEXT CHECK(llm_service IN (${LLM_SERVICE_CHECK})),
        llm_model TEXT,
        processed_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL DEFAULT (strftime('%s','now') * 1000),
        deleted_at BIGINT,
        estimated_processing_breakdown TEXT,
        video_publish_date TEXT,
        video_thumbnail TEXT,
        channel_url TEXT,
        audio_file_name TEXT,
        audio_file_size BIGINT,
        transcription_processing_time BIGINT,
        transcription_token_count BIGINT,
        transcription_cost REAL,
        llm_processing_time BIGINT,
        llm_input_token_count BIGINT,
        llm_output_token_count BIGINT,
        llm_cost REAL,
        selected_prompts TEXT,
        tts_enabled INTEGER DEFAULT 0,
        tts_service TEXT CHECK(tts_service IN (${TTS_SERVICE_CHECK})),
        tts_model TEXT,
        tts_voice TEXT,
        tts_audio_file TEXT,
        tts_processing_time BIGINT,
        tts_audio_duration REAL,
        tts_cost REAL,
        image_gen_enabled INTEGER DEFAULT 0,
        image_gen_service TEXT CHECK(image_gen_service IN (${IMAGE_SERVICE_CHECK})),
        image_gen_model TEXT,
        images_generated INTEGER,
        image_gen_processing_time BIGINT,
        image_gen_cost REAL,
        selected_image_prompts TEXT,
        image_files TEXT,
        music_gen_enabled INTEGER DEFAULT 0,
        music_gen_service TEXT CHECK(music_gen_service IN (${MUSIC_SERVICE_CHECK})),
        music_gen_model TEXT,
        music_gen_genre TEXT CHECK(music_gen_genre IN ('rap', 'rock', 'pop', 'country', 'folk', 'jazz', 'electronic')),
        music_gen_preset TEXT CHECK(music_gen_preset IN ('cheap', 'balanced', 'quality')),
        music_gen_target_duration INTEGER,
        music_gen_instrumental INTEGER,
        music_gen_sample_rate INTEGER CHECK(music_gen_sample_rate IS NULL OR music_gen_sample_rate IN (16000, 24000, 32000, 44100)),
        music_gen_bitrate INTEGER CHECK(music_gen_bitrate IS NULL OR music_gen_bitrate IN (32000, 64000, 128000, 256000)),
        music_gen_file TEXT,
        music_gen_processing_time BIGINT,
        music_gen_duration REAL,
        music_gen_cost REAL,
        music_gen_lyrics_length INTEGER,
        music_gen_lyrics_generation_time BIGINT,
        music_gen_lyrics TEXT,
        video_gen_enabled INTEGER DEFAULT 0,
        video_gen_service TEXT,
        video_gen_model TEXT,
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
        input_type TEXT CHECK(input_type IS NULL OR input_type IN ('audio-video', 'document')) DEFAULT 'audio-video',
        audio_s3_url TEXT,
        tts_s3_url TEXT,
        image_s3_urls TEXT,
        music_s3_url TEXT,
        video_s3_urls TEXT,
        thumbnail_s3_url TEXT
`
const SHOW_NOTES_REPAIR_TABLE = 'show_notes_schema_repair'
const SHOW_NOTES_INDEX_DEFINITIONS = `
      CREATE INDEX IF NOT EXISTS idx_show_notes_processed_at
      ON show_notes(processed_at DESC);
`
type SqliteTableInfoRow = {
  name: string
}

type SqliteTableExistsRow = {
  name: string
}

const applyConnectionPragmas = async (db: SQL): Promise<void> => {
  await db.unsafe('PRAGMA journal_mode = WAL')
  await db.unsafe('PRAGMA busy_timeout = 5000')
  await db.unsafe('PRAGMA foreign_keys = ON')
}

const getTableColumnNames = async (db: SQL, tableName: string): Promise<string[]> => {
  const rows = await db.unsafe(`PRAGMA table_info("${tableName.replaceAll('"', '""')}")`) as SqliteTableInfoRow[]
  return rows.map(row => row.name)
}

const createShowNotesIndexes = async (db: SQL): Promise<void> => {
  await db.unsafe(SHOW_NOTES_INDEX_DEFINITIONS)
}

const LEGACY_APP_TABLES = [
  SHOW_NOTES_REPAIR_TABLE,
  'show_note_assets',
  'show_notes',
  'jobs',
  'presets',
  'credits_promo_redemption',
  'credits_transaction',
  'credits_balance',
  'auth_audit',
  'auth_rate_limit',
  'verification',
  'account',
  'session',
  'user',
] as const

const REMOVED_APP_TABLES = [
  'backup_runs',
] as const

const legacyTableExists = async (db: SQL, tableName: string): Promise<boolean> => {
  const rows = await db`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = ${tableName}
    LIMIT 1
  ` as SqliteTableExistsRow[]

  return rows.length > 0
}

const needsCleanSlateReset = async (db: SQL): Promise<boolean> => {
  if (await legacyTableExists(db, 'user')) return true
  if (await legacyTableExists(db, 'credits_balance')) return true
  if (await legacyTableExists(db, 'auth_rate_limit')) return true

  const showNoteColumns = new Set(await getTableColumnNames(db, 'show_notes'))
  if (showNoteColumns.size === 0) return false

  return showNoteColumns.has('user_id')
    || showNoteColumns.has('cost_credits')
    || showNoteColumns.has('is_public')
    || showNoteColumns.has('shared_at')
}

const resetLegacyAppSchema = async (db: SQL): Promise<void> => {
  if (!await needsCleanSlateReset(db)) return

  await db.unsafe('PRAGMA foreign_keys = OFF')
  try {
    await db.unsafe('BEGIN IMMEDIATE')
    for (const tableName of LEGACY_APP_TABLES) {
      await db.unsafe(`DROP TABLE IF EXISTS "${tableName}"`)
    }
    await db.unsafe('COMMIT')
  } catch (error) {
    await db.unsafe('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    await db.unsafe('PRAGMA foreign_keys = ON')
  }
}

const dropRemovedAppTables = async (db: SQL): Promise<void> => {
  for (const tableName of REMOVED_APP_TABLES) {
    await db.unsafe(`DROP TABLE IF EXISTS "${tableName}"`)
  }
}

export const getDatabase = (): SQL => {
  if (!sql) {
    const dbUrl = process.env["DATABASE_URL"] || "sqlite://./data/autoshow.sqlite"

    try {
      if (dbUrl.startsWith("sqlite://")) {
        const dbPath = dbUrl.replace("sqlite://", "")
        const dir = dbPath.substring(0, dbPath.lastIndexOf("/"))
        if (dir) mkdirSync(dir, { recursive: true })
      }
      sql = new SQL(dbUrl)
    } catch (error) {
      err('Failed to initialize database', error)
      throw error
    }
  }

  return sql
}

export const initializeSchema = async (db: SQL): Promise<void> => {
  try {
    await applyConnectionPragmas(db)
    if (schemaInitialized) return

    await resetLegacyAppSchema(db)
    await dropRemovedAppTables(db)

    await db.unsafe(`CREATE TABLE IF NOT EXISTS show_notes (${SHOW_NOTES_COLUMN_DEFINITIONS})`)
    await createShowNotesIndexes(db)

    await db.unsafe(`
      CREATE TABLE IF NOT EXISTS show_note_assets (
        id TEXT PRIMARY KEY,
        show_note_id TEXT NOT NULL REFERENCES show_notes(id) ON DELETE CASCADE,
        job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK(kind IN ('llm', 'tts', 'image', 'music', 'video')),
        service TEXT,
        model TEXT,
        file_path TEXT,
        thumbnail_file_path TEXT,
        metadata_json TEXT,
        created_at BIGINT NOT NULL DEFAULT (strftime('%s','now') * 1000),
        updated_at BIGINT NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_show_note_assets_show_note_created
      ON show_note_assets(show_note_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_show_note_assets_job
      ON show_note_assets(job_id);

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
        created_at BIGINT NOT NULL DEFAULT (strftime('%s','now') * 1000),
        started_at BIGINT,
        completed_at BIGINT,
        updated_at BIGINT NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

      CREATE TABLE IF NOT EXISTS rate_limit (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        count INTEGER NOT NULL,
        reset_at TEXT NOT NULL,
        blocked_until TEXT
      );

      CREATE TABLE IF NOT EXISTS presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE,
        compatibility_key TEXT NOT NULL CHECK (compatibility_key IN ('document', 'audio-file', 'audio-streaming')),
        version INTEGER NOT NULL DEFAULT 1,
        config_json TEXT NOT NULL,
        created_at BIGINT NOT NULL DEFAULT (strftime('%s','now') * 1000),
        updated_at BIGINT NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_presets_updated ON presets(updated_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_presets_name ON presets(name);

      CREATE INDEX IF NOT EXISTS idx_jobs_show_note_id ON jobs(show_note_id);
    `)

    schemaInitialized = true
  } catch (error) {
    err('Failed to initialize schema', error)
    throw error
  }
}

export const initializeAppDatabase = async (): Promise<SQL> => {
  const db = getDatabase()

  if (!schemaInitializationPromise) {
    schemaInitializationPromise = initializeSchema(db).catch((error) => {
      schemaInitializationPromise = null
      throw error
    })
  }

  await schemaInitializationPromise
  return db
}

export const resetDatabaseForTests = async (): Promise<void> => {
  schemaInitialized = false
  schemaInitializationPromise = null

  const currentSql = sql as (SQL & { close?: () => void | Promise<void> }) | null
  sql = null

  if (currentSql?.close) {
    await currentSql.close()
  }
}

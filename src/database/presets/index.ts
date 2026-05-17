import type { SQL } from 'bun'
import type { PresetConfig,PresetPatchBody,PresetRecord,SourceDatabasePresetsIndexPresetRow as PresetRow } from '~/types'
import { PresetConfigSchema,PresetRecordSchema,validateOrThrow } from '~/types'

const DUPLICATE_PRESET_NAME_PATTERN = /UNIQUE constraint failed: presets\.name/i

const parsePresetRow = (row: PresetRow): PresetRecord => {
  const config = validateOrThrow(PresetConfigSchema, JSON.parse(row.config_json), 'Invalid preset config')

  return validateOrThrow(PresetRecordSchema, {
    id: row.id,
    name: row.name,
    compatibilityKey: row.compatibility_key,
    version: row.version,
    config,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }, 'Invalid preset row')
}

const mapDuplicateNameError = (error: unknown): never => {
  if (error instanceof Error && DUPLICATE_PRESET_NAME_PATTERN.test(error.message)) {
    throw new Error('A preset with this name already exists')
  }

  throw error
}
export const getPreset = async (
  db: SQL,
  presetId: string
): Promise<PresetRecord | null> => {
  const rows = await db`
    SELECT id, name, compatibility_key, version, config_json, created_at, updated_at
    FROM presets
    WHERE id = ${presetId}
    LIMIT 1
  ` as PresetRow[]

  return rows[0] ? parsePresetRow(rows[0]) : null
}

export const listPresets = async (db: SQL): Promise<PresetRecord[]> => {
  const rows = await db`
    SELECT id, name, compatibility_key, version, config_json, created_at, updated_at
    FROM presets
    ORDER BY updated_at DESC, name ASC
  ` as PresetRow[]

  return rows.map(parsePresetRow)
}

export const createPreset = async (
  db: SQL,
  name: string,
  config: PresetConfig,
  version: number = 1
): Promise<PresetRecord> => {
  const now = Date.now()
  const presetId = crypto.randomUUID()

  try {
    await db`
      INSERT INTO presets (id, name, compatibility_key, version, config_json, created_at, updated_at)
      VALUES (${presetId}, ${name}, ${config.compatibilityKey}, ${version}, ${JSON.stringify(config)}, ${now}, ${now})
    `
  } catch (error) {
    mapDuplicateNameError(error)
  }

  const createdPreset = await getPreset(db, presetId)
  if (!createdPreset) {
    throw new Error('Failed to create preset')
  }

  return createdPreset
}

export const updatePreset = async (
  db: SQL,
  presetId: string,
  patch: PresetPatchBody
): Promise<PresetRecord | null> => {
  const existingPreset = await getPreset(db, presetId)
  if (!existingPreset) {
    return null
  }

  const nextName = patch.name ?? existingPreset.name
  const nextConfig = patch.config ?? existingPreset.config
  const nextVersion = patch.version ?? existingPreset.version
  const updatedAt = Date.now()

  try {
    await db`
      UPDATE presets
      SET
        name = ${nextName},
        compatibility_key = ${nextConfig.compatibilityKey},
        version = ${nextVersion},
        config_json = ${JSON.stringify(nextConfig)},
        updated_at = ${updatedAt}
      WHERE id = ${presetId}
    `
  } catch (error) {
    mapDuplicateNameError(error)
  }

  return await getPreset(db, presetId)
}

export const deletePreset = async (
  db: SQL,
  presetId: string
): Promise<boolean> => {
  const existingPreset = await getPreset(db, presetId)
  if (!existingPreset) {
    return false
  }

  await db`
    DELETE FROM presets
    WHERE id = ${presetId}
  `

  return true
}

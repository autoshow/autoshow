import type { APIEvent } from '@solidjs/start/server'
import * as v from 'valibot'
import { getDatabase,initializeSchema } from '~/database/db'
import { createPreset,listPresets } from '~/database/presets'
import { getPresetConfigError,normalizePresetConfig,normalizePresetName } from '~/routes/presets/presets'
import {
PresetUpsertBodySchema,
validationErrorResponse,
} from '~/types'
import { err } from '~/utils/logger/logging'

export async function GET(_event: APIEvent) {
  try {
    const db = getDatabase()
    await initializeSchema(db)
    const presets = await listPresets(db)
    return Response.json({ presets })
  } catch (error) {
    err('Failed to list presets', error)
    return Response.json({ error: 'Failed to list presets' }, { status: 500 })
  }
}

export async function POST({ request }: APIEvent) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parseResult = v.safeParse(PresetUpsertBodySchema, body)
    if (!parseResult.success) {
      return validationErrorResponse(parseResult.issues)
    }

    const name = normalizePresetName(parseResult.output.name)
    if (!name) {
      return Response.json({ error: 'Preset name is required' }, { status: 400 })
    }

    const config = normalizePresetConfig(parseResult.output.config)
    const configError = getPresetConfigError(config)
    if (configError) {
      return Response.json({ error: configError }, { status: 400 })
    }

    const db = getDatabase()
    await initializeSchema(db)
    const preset = await createPreset(db, name, config, parseResult.output.version)
    return Response.json({ preset }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'A preset with this name already exists') {
      return Response.json({ error: error.message }, { status: 409 })
    }

    err('Failed to create preset', error)
    return Response.json({ error: 'Failed to create preset' }, { status: 500 })
  }
}

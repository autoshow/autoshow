import type { APIEvent } from '@solidjs/start/server'
import * as v from 'valibot'
import { getDatabase,initializeSchema } from '~/database/db'
import { deletePreset,updatePreset } from '~/database/presets'
import { getPresetConfigError,normalizePresetConfig,normalizePresetName } from '~/routes/presets/presets'
import {
PresetIdSchema,
PresetPatchBodySchema,
validationErrorResponse,
} from '~/types'
import { err } from '~/utils/logger/logging'

export async function PATCH({ request, params }: APIEvent) {
  try {
    const presetIdResult = v.safeParse(PresetIdSchema, params.id)
    if (!presetIdResult.success) {
      return Response.json({ error: 'Invalid preset ID' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parseResult = v.safeParse(PresetPatchBodySchema, body)
    if (!parseResult.success) {
      return validationErrorResponse(parseResult.issues)
    }

    const patch = {
      ...(parseResult.output.name != null ? { name: normalizePresetName(parseResult.output.name) } : {}),
      ...(parseResult.output.config != null ? { config: normalizePresetConfig(parseResult.output.config) } : {}),
      ...(parseResult.output.version != null ? { version: parseResult.output.version } : {}),
    }

    if ('name' in patch && !patch.name) {
      return Response.json({ error: 'Preset name is required' }, { status: 400 })
    }

    if ('config' in patch) {
      const configError = getPresetConfigError(patch.config)
      if (configError) {
        return Response.json({ error: configError }, { status: 400 })
      }
    }

    const db = getDatabase()
    await initializeSchema(db)
    const preset = await updatePreset(db, presetIdResult.output, patch)
    if (!preset) {
      return Response.json({ error: 'Preset not found' }, { status: 404 })
    }

    return Response.json({ preset })
  } catch (error) {
    if (error instanceof Error && error.message === 'A preset with this name already exists') {
      return Response.json({ error: error.message }, { status: 409 })
    }

    err('Failed to update preset', error)
    return Response.json({ error: 'Failed to update preset' }, { status: 500 })
  }
}

export async function DELETE({ params }: APIEvent) {
  try {
    const presetIdResult = v.safeParse(PresetIdSchema, params.id)
    if (!presetIdResult.success) {
      return Response.json({ error: 'Invalid preset ID' }, { status: 400 })
    }

    const db = getDatabase()
    await initializeSchema(db)
    const deleted = await deletePreset(db, presetIdResult.output)
    if (!deleted) {
      return Response.json({ error: 'Preset not found' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    err('Failed to delete preset', error)
    return Response.json({ error: 'Failed to delete preset' }, { status: 500 })
  }
}

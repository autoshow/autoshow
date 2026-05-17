import type { APIEvent } from "@solidjs/start/server"
import * as v from 'valibot'
import { getDatabase,initializeSchema } from "~/database/db"
import { getShowNoteById } from "~/database/notes/show-note-access"
import { hasShowNoteTextOutputForAppend } from "~/database/notes/show-note-assets"
import { createAndDispatchAppendAssetsJob } from "~/routes/api/process/append-assets/create-append-assets-job"
import {
buildAppendAssetsOptions,
estimateAppendAssetsCostBreakdown,
hasAnyAppendAssetSelection,
parseAppendAssetsFormData
} from "~/routes/api/process/form-helpers/append-assets"
import { ShowNoteIdSchema,validationErrorResponse } from "~/types"
import { err } from "~/utils/logger/logging"

export async function POST({ request, params }: APIEvent) {
  try {
    const idResult = v.safeParse(ShowNoteIdSchema, params.id)
    if (!idResult.success) {
      return Response.json({ error: 'Invalid show note ID' }, { status: 400 })
    }

    const formData = await request.formData()
    const formResult = parseAppendAssetsFormData(formData)
    if (!formResult.success) {
      if ('fieldError' in formResult) {
        return Response.json({ error: formResult.fieldError }, { status: 400 })
      }
      return validationErrorResponse(formResult.issues)
    }

    const db = getDatabase()
    await initializeSchema(db)

    const note = await getShowNoteById(db, idResult.output)
    if (!note) {
      return Response.json({ error: 'Show note not found' }, { status: 404 })
    }

    let options
    try {
      options = buildAppendAssetsOptions(formResult.output, note)
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Invalid append asset options' },
        { status: 400 }
      )
    }

    if (!hasAnyAppendAssetSelection(options)) {
      return Response.json({ error: 'Select at least one asset to generate' }, { status: 400 })
    }

    if (options.ttsEnabled && !options.llmEnabled && !(await hasShowNoteTextOutputForAppend(db, note))) {
      return Response.json(
        { error: 'TTS requires an existing text output or a new LLM output in this append run' },
        { status: 400 }
      )
    }

    const jobId = await createAndDispatchAppendAssetsJob({
      ...options,
      appendMode: 'assets',
      showNoteId: note.id,
      estimatedCostUsd: estimateAppendAssetsCostBreakdown(options).total,
    })

    return Response.json({ jobId })
  } catch (error) {
    err('Failed to create append assets job', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to start append assets job' },
      { status: 500 }
    )
  }
}

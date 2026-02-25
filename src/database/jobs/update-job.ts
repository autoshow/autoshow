import type { SQL } from "bun"
import { UpdateJobProgressInputSchema, validateOrThrow } from "~/types"

export const updateJobProgress = async (db: SQL, id: string, input: unknown): Promise<void> => {
  const validInput = validateOrThrow(UpdateJobProgressInputSchema, input, 'Invalid job progress update input')
  const updatedAt = validInput.updatedAt ?? Date.now()

  const status = validInput.status ?? null
  const currentStep = validInput.currentStep ?? null
  const stepName = validInput.stepName ?? null
  const stepProgress = validInput.stepProgress ?? null
  const overallProgress = validInput.overallProgress ?? null
  const message = validInput.message ?? null
  const startedAt = validInput.startedAt ?? null

  await db`
    UPDATE jobs
    SET
      status = COALESCE(${status}, status),
      current_step = COALESCE(${currentStep}, current_step),
      step_name = COALESCE(${stepName}, step_name),
      step_progress = COALESCE(${stepProgress}, step_progress),
      overall_progress = COALESCE(${overallProgress}, overall_progress),
      message = COALESCE(${message}, message),
      started_at = COALESCE(${startedAt}, started_at),
      updated_at = ${updatedAt}
    WHERE id = ${id}
  `
}

export const completeJob = async (db: SQL, id: string, showNoteId: string): Promise<void> => {
  const now = Date.now()

  await db`
    UPDATE jobs
    SET status = 'completed',
        show_note_id = ${showNoteId},
        completed_at = ${now},
        updated_at = ${now},
        overall_progress = 100,
        step_progress = 100
    WHERE id = ${id}
  `
}

export const failJob = async (db: SQL, id: string, error: string): Promise<void> => {
  const now = Date.now()

  await db`
    UPDATE jobs
    SET status = 'error',
        error = ${error},
        completed_at = ${now},
        updated_at = ${now}
    WHERE id = ${id}
  `
}

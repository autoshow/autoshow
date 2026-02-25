import type { SQL } from "bun"
import { JobSchema, validateOrThrow, type Job } from "~/types"

export const getJobById = async (db: SQL, id: string): Promise<Job | null> => {
  const rows = await db`SELECT * FROM jobs WHERE id = ${id}`
  const row = rows[0] as Record<string, unknown> | undefined

  if (!row) return null

  const mapped = {
    id: row.id,
    status: row.status,
    currentStep: row.current_step,
    stepName: row.step_name,
    stepProgress: row.step_progress,
    overallProgress: row.overall_progress,
    message: row.message,
    error: row.error,
    showNoteId: row.show_note_id,
    inputData: row.input_data,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at
  }

  return validateOrThrow(JobSchema, mapped, 'Invalid job data in database')
}

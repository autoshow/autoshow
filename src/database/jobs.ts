import type { Database } from "bun:sqlite"
import type { Job } from "~/types/main"
import { CreateJobInputSchema, UpdateJobProgressInputSchema, JobSchema, validateOrThrow } from "~/types/main"

export const createJob = (db: Database, id: string, input: unknown): void => {
  const validInput = validateOrThrow(CreateJobInputSchema, input, 'Invalid job creation input')
  const query = db.query(`
    INSERT INTO jobs (id, status, input_data, created_at, updated_at)
    VALUES ($id, $status, $inputData, $createdAt, $createdAt)
  `)
  
  query.run({
    id,
    status: validInput.status,
    inputData: validInput.inputData,
    createdAt: validInput.createdAt
  })
}

export const getJobById = (db: Database, id: string): Job | null => {
  const query = db.query(`SELECT * FROM jobs WHERE id = $id`)
  const row = query.get({ id }) as Record<string, unknown> | null
  
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

export const updateJobProgress = (db: Database, id: string, input: unknown): void => {
  const validInput = validateOrThrow(UpdateJobProgressInputSchema, input, 'Invalid job progress update input')
  const updates: string[] = []
  const params: Record<string, unknown> = { id }
  
  if (validInput.status !== undefined) {
    updates.push("status = $status")
    params.status = validInput.status
  }
  if (validInput.currentStep !== undefined) {
    updates.push("current_step = $currentStep")
    params.currentStep = validInput.currentStep
  }
  if (validInput.stepName !== undefined) {
    updates.push("step_name = $stepName")
    params.stepName = validInput.stepName
  }
  if (validInput.stepProgress !== undefined) {
    updates.push("step_progress = $stepProgress")
    params.stepProgress = validInput.stepProgress
  }
  if (validInput.overallProgress !== undefined) {
    updates.push("overall_progress = $overallProgress")
    params.overallProgress = validInput.overallProgress
  }
  if (validInput.message !== undefined) {
    updates.push("message = $message")
    params.message = validInput.message
  }
  if (validInput.startedAt !== undefined) {
    updates.push("started_at = $startedAt")
    params.startedAt = validInput.startedAt
  }
  
  updates.push("updated_at = $updatedAt")
  params.updatedAt = validInput.updatedAt ?? Date.now()
  
  if (updates.length === 0) return
  
  const query = db.query(`
    UPDATE jobs SET ${updates.join(", ")} WHERE id = $id
  `)
  
  query.run(params as Parameters<typeof query.run>[0])
}

export const completeJob = (db: Database, id: string, showNoteId: string): void => {
  const now = Date.now()
  const query = db.query(`
    UPDATE jobs 
    SET status = 'completed', 
        show_note_id = $showNoteId, 
        completed_at = $completedAt,
        updated_at = $updatedAt,
        overall_progress = 100,
        step_progress = 100
    WHERE id = $id
  `)
  
  query.run({
    id,
    showNoteId,
    completedAt: now,
    updatedAt: now
  })
}

export const failJob = (db: Database, id: string, error: string): void => {
  const now = Date.now()
  const query = db.query(`
    UPDATE jobs 
    SET status = 'error', 
        error = $error, 
        completed_at = $completedAt,
        updated_at = $updatedAt
    WHERE id = $id
  `)
  
  query.run({
    id,
    error,
    completedAt: now,
    updatedAt: now
  })
}

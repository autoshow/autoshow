import * as v from 'valibot'

export const ProgressStatusSchema = v.union([
  v.literal('pending'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('error'),
  v.literal('skipped')
])

export const SubStepSchema = v.object({
  current: v.pipe(v.number(), v.integer(), v.minValue(0)),
  total: v.pipe(v.number(), v.integer(), v.minValue(1)),
  description: v.optional(v.string(), undefined)
})

export const ProgressUpdateSchema = v.object({
  step: v.pipe(v.number(), v.integer(), v.minValue(1)),
  stepName: v.pipe(v.string(), v.nonEmpty()),
  stepProgress: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
  overallProgress: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
  status: ProgressStatusSchema,
  message: v.string(),
  subStep: v.optional(SubStepSchema, undefined),
  error: v.optional(v.string(), undefined),
  showNoteId: v.optional(v.string(), undefined)
})

export type ProgressStatus = v.InferOutput<typeof ProgressStatusSchema>
export type ProgressUpdate = v.InferOutput<typeof ProgressUpdateSchema>

export interface IProgressTracker {
  updateStep(
    step: number,
    stepProgress: number,
    status: ProgressStatus,
    message: string,
    subStep?: { current: number; total: number; description?: string },
    error?: string
  ): void
  startStep(step: number, message: string): void
  updateStepProgress(step: number, progress: number, message: string): void
  updateStepWithSubStep(
    step: number,
    current: number,
    total: number,
    description: string,
    message: string
  ): void
  completeStep(step: number, message: string): void
  skipStep(step: number): void
  error(step: number, message: string, error: string): void
  complete(showNoteId: string): void
}

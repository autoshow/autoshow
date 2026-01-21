import * as v from 'valibot'

export const JobStatusSchema = v.picklist(['pending', 'processing', 'completed', 'error'])
export type JobStatus = v.InferOutput<typeof JobStatusSchema>

export const JobSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  status: JobStatusSchema,
  currentStep: v.pipe(v.number(), v.integer(), v.minValue(0)),
  stepName: v.nullable(v.string()),
  stepProgress: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
  overallProgress: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
  message: v.nullable(v.string()),
  error: v.nullable(v.string()),
  showNoteId: v.nullable(v.string()),
  inputData: v.pipe(v.string(), v.nonEmpty()),
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  startedAt: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  completedAt: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  updatedAt: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export type Job = v.InferOutput<typeof JobSchema>

export const CreateJobInputSchema = v.object({
  status: JobStatusSchema,
  inputData: v.pipe(v.string(), v.nonEmpty()),
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const UpdateJobProgressInputSchema = v.object({
  status: v.optional(JobStatusSchema),
  currentStep: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  stepName: v.optional(v.string()),
  stepProgress: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100))),
  overallProgress: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100))),
  message: v.optional(v.string()),
  startedAt: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  updatedAt: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)))
})

export type CreateJobInput = v.InferOutput<typeof CreateJobInputSchema>
export type UpdateJobProgressInput = v.InferOutput<typeof UpdateJobProgressInputSchema>

import * as v from 'valibot'
import { BigIntSchema, NullableBigIntSchema } from './validation-types'

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
  createdAt: BigIntSchema,
  startedAt: NullableBigIntSchema,
  completedAt: NullableBigIntSchema,
  updatedAt: BigIntSchema
})

export type Job = v.InferOutput<typeof JobSchema>

export const CreateJobInputSchema = v.object({
  status: JobStatusSchema,
  inputData: v.pipe(v.string(), v.nonEmpty()),
  createdAt: BigIntSchema
})

export const UpdateJobProgressInputSchema = v.object({
  status: v.optional(JobStatusSchema),
  currentStep: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  stepName: v.optional(v.string()),
  stepProgress: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100))),
  overallProgress: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100))),
  message: v.optional(v.string()),
  startedAt: v.optional(BigIntSchema),
  updatedAt: v.optional(BigIntSchema)
})

export type CreateJobInput = v.InferOutput<typeof CreateJobInputSchema>
export type UpdateJobProgressInput = v.InferOutput<typeof UpdateJobProgressInputSchema>

export const JobIdParamSchema = v.pipe(v.string(), v.nonEmpty())

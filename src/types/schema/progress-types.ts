import * as v from 'valibot'

export const ProgressStatusSchema = v.union([
  v.literal('pending'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('error'),
  v.literal('skipped')
])

const SubStepSchema = v.object({
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
  showNoteId: v.optional(v.string(), undefined),
  skippedSteps: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1))), undefined)
})

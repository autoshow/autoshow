import * as v from 'valibot'

const SPEED_OPERATIONS = [
  'transcription',
  'llm',
  'document',
  'tts',
  'image',
  'music',
  'video'
] as const

export const SpeedOperationSchema = v.picklist(SPEED_OPERATIONS)

export const SpeedOperationProfileSchema = v.object({
  baseMs: v.pipe(v.number(), v.minValue(0)),
  perInputMinuteMs: v.optional(v.pipe(v.number(), v.minValue(0))),
  perPageMs: v.optional(v.pipe(v.number(), v.minValue(0))),
  perOutputSecondMs: v.optional(v.pipe(v.number(), v.minValue(0))),
  perCharacterMs: v.optional(v.pipe(v.number(), v.minValue(0)))
})

export const SpeedProfileSchema = v.object({
  transcription: v.optional(SpeedOperationProfileSchema),
  llm: v.optional(SpeedOperationProfileSchema),
  document: v.optional(SpeedOperationProfileSchema),
  tts: v.optional(SpeedOperationProfileSchema),
  image: v.optional(SpeedOperationProfileSchema),
  music: v.optional(SpeedOperationProfileSchema),
  video: v.optional(SpeedOperationProfileSchema)
})

import * as v from 'valibot'
import { DeapiResultSchema } from './step-2-transcription-types'

export const DeapiDocumentStatusResponseSchema = v.object({
  data: v.object({
    status: v.union([v.literal('pending'), v.literal('processing'), v.literal('done'), v.literal('error')]),
    progress: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(100)))),
    result_url: v.optional(v.nullable(v.string())),
    result: v.optional(v.nullable(v.union([v.string(), DeapiResultSchema]))),
    error: v.optional(v.nullable(v.string())),
    preview: v.optional(v.unknown()),
    results_alt_formats: v.optional(v.unknown())
  })
})

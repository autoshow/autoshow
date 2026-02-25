import * as v from 'valibot'

export const S3UploadResultSchema = v.object({
  s3Url: v.pipe(v.string(), v.nonEmpty()),
  objectKey: v.pipe(v.string(), v.nonEmpty()),
  uploadedAt: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export type S3UploadResult = v.InferOutput<typeof S3UploadResultSchema>

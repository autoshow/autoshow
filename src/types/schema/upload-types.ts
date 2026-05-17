import * as v from 'valibot'

export const UploadIdSchema = v.pipe(v.string(), v.nonEmpty())
export const UploadSessionIdSchema = v.pipe(
  v.string(),
  v.nonEmpty(),
  v.maxLength(160),
  v.regex(/^[a-zA-Z0-9_-]+$/, 'Upload session ID must contain only alphanumeric characters, hyphens, and underscores')
)

const UploadFileNameSchema = v.pipe(v.string(), v.nonEmpty(), v.maxLength(255))
const UploadFileSizeSchema = v.pipe(v.number(), v.integer(), v.minValue(1))

const BaseUploadRegistryEntrySchema = v.object({
  uploadId: UploadIdSchema,
  originalFileName: v.pipe(v.string(), v.nonEmpty()),
  storedFileName: v.pipe(v.string(), v.nonEmpty()),
  fileSize: v.pipe(v.number(), v.integer(), v.minValue(0)),
  duration: v.optional(v.pipe(v.number(), v.minValue(0)), undefined),
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const LocalUploadRegistryEntrySchema = v.object({
  ...BaseUploadRegistryEntrySchema.entries,
  storage: v.optional(v.literal('local'), 'local'),
  filePath: v.pipe(v.string(), v.nonEmpty())
})

export const S3UploadRegistryEntrySchema = v.object({
  ...BaseUploadRegistryEntrySchema.entries,
  storage: v.literal('s3'),
  objectKey: v.pipe(v.string(), v.nonEmpty()),
  bucketUrl: v.optional(v.pipe(v.string(), v.nonEmpty()), undefined)
})

export const UploadRegistryEntrySchema = v.union([
  LocalUploadRegistryEntrySchema,
  S3UploadRegistryEntrySchema
])

export const DirectUploadSessionSchema = v.object({
  uploadSessionId: UploadSessionIdSchema,
  objectKey: v.pipe(v.string(), v.nonEmpty()),
  fileName: UploadFileNameSchema,
  fileSize: UploadFileSizeSchema,
  contentType: v.optional(v.pipe(v.string(), v.maxLength(200)), undefined),
  expiresAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const CreateUploadUrlRequestSchema = v.object({
  fileName: UploadFileNameSchema,
  fileSize: UploadFileSizeSchema,
  contentType: v.optional(v.pipe(v.string(), v.maxLength(200)), undefined)
})

export const CompleteUploadRequestSchema = v.object({
  uploadSessionId: UploadSessionIdSchema,
  objectKey: v.pipe(v.string(), v.nonEmpty(), v.maxLength(1024)),
  fileName: UploadFileNameSchema,
  fileSize: UploadFileSizeSchema
})

export const GoogleDriveImportRequestSchema = v.object({
  fileId: v.pipe(v.string(), v.nonEmpty(), v.maxLength(512)),
  name: v.optional(v.pipe(v.string(), v.maxLength(255)), undefined),
  mimeType: v.optional(v.pipe(v.string(), v.maxLength(255)), undefined),
  resourceKey: v.optional(v.pipe(v.string(), v.maxLength(512)), undefined)
})

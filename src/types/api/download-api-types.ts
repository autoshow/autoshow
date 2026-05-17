import type * as v from 'valibot'
import type { UrlTypeSchema } from '../schema/step-1-types'
import type { CompleteUploadRequestSchema,CreateUploadUrlRequestSchema,DirectUploadSessionSchema,UploadRegistryEntrySchema } from '../schema/upload-types'

export type UrlType = v.InferOutput<typeof UrlTypeSchema>
export type UploadRegistryEntry = v.InferOutput<typeof UploadRegistryEntrySchema>
export type DirectUploadSession = v.InferOutput<typeof DirectUploadSessionSchema>
export type CreateUploadUrlRequest = v.InferOutput<typeof CreateUploadUrlRequestSchema>
export type CompleteUploadRequest = v.InferOutput<typeof CompleteUploadRequestSchema>

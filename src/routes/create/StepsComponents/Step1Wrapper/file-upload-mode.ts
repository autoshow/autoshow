export const DIRECT_UPLOAD_THRESHOLD_BYTES = 64 * 1024 * 1024

export type FileUploadMode = 'small' | 'direct' | 'chunked'

export const selectPreferredFileUploadMode = (fileSize: number): FileUploadMode => {
  return fileSize > DIRECT_UPLOAD_THRESHOLD_BYTES ? 'direct' : 'small'
}

export const shouldFallbackToChunkedUpload = (status: number): boolean => {
  return status === 503
}

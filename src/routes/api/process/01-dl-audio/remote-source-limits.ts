import { UPLOAD_LIMITS } from '~/routes/api/download/upload-security'

export const MAX_REMOTE_DOCUMENT_BYTES = 300 * 1024 * 1024

export const getMaxAudioInputBytes = (): number => {
  return UPLOAD_LIMITS.maxUploadBytes
}

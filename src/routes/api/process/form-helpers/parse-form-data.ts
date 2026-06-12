import * as v from 'valibot'
import { ProcessingFormDataSchema } from '~/types'

const LEGACY_UPLOAD_FIELDS = ['uploadedFilePath', 'uploadedFileName'] as const

export const getLegacyUploadFieldError = (rawInput: Record<string, unknown>): string | null => {
  const legacyField = LEGACY_UPLOAD_FIELDS.find(field => rawInput[field] != null)
  return legacyField ? `${legacyField} is no longer accepted; use uploadId instead` : null
}

export const parseProcessingFormData = (formData: FormData) => {
  const rawFormData: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      if (value.length === 0) {
        continue
      }
      rawFormData[key] = value
    }
  }
  return v.safeParse(ProcessingFormDataSchema, rawFormData)
}

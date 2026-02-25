import * as v from 'valibot'
import { ProcessingFormDataSchema } from '~/types'

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

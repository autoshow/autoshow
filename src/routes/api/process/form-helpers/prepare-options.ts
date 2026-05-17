import type { ProcessingFormData,ProcessingOptions,ResolvedUploadSource } from '~/types'
import { validateProcessingInput } from '~/types'
import { buildProcessingOptions } from './build-options'

export const prepareProcessingOptions = (
  form: ProcessingFormData,
  resolvedUpload?: ResolvedUploadSource
): ProcessingOptions => {
  const options = buildProcessingOptions(form, resolvedUpload)

  const validationError = validateProcessingInput({
    url: options.url,
    urlType: options.urlType,
    uploadId: options.uploadId,
    llmEnabled: options.llmEnabled ?? false,
    selectedPrompts: options.selectedPrompts,
    imageGenEnabled: options.imageGenEnabled ?? false,
    selectedImagePrompts: options.selectedImagePrompts ?? [],
    videoGenEnabled: options.videoGenEnabled ?? false,
    selectedVideoPrompts: options.selectedVideoPrompts ?? []
  })

  if (validationError) {
    throw new Error(validationError)
  }

  return options
}

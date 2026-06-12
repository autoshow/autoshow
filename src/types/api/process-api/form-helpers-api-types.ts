export type ProcessingInputValidation = {
  url: string | undefined
  urlType: string | undefined
  uploadId: string | undefined
  llmEnabled: boolean
  selectedPrompts: string[]
  imageGenEnabled: boolean
  selectedImagePrompts: string[]
  videoGenEnabled: boolean
  selectedVideoPrompts: string[]
}

import type { resolveMediaOptions,resolveSourceOptions } from '~/routes/api/process/form-helpers/resolve-options'
export type SourceRoutesApiProcessFormHelpersBuildOptionsResolvedFeatures = {
  llmEnabled: boolean
  ttsEnabled: boolean
  imageGenEnabled: boolean
  musicGenEnabled: boolean
  videoGenEnabled: boolean
}

export type SourceRoutesApiProcessFormHelpersBuildOptionsResolvedSource = ReturnType<typeof resolveSourceOptions>

export type SourceRoutesApiProcessFormHelpersBuildOptionsResolvedMedia = ReturnType<typeof resolveMediaOptions>

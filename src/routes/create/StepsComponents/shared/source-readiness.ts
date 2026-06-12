import type { StepsState } from '~/types'

type SourceState = Pick<StepsState, 'uploadId' | 'uploadedFileName' | 'urlMetadata' | 'urlVerified'>

export const hasUploadedSource = (state: SourceState): boolean => {
  return !!state.uploadId && !!state.uploadedFileName
}

export const hasVerifiedUrlSource = (state: SourceState): boolean => {
  return state.urlVerified && !!state.urlMetadata && !state.urlMetadata.error
}

export const isSourceReady = (state: SourceState): boolean => {
  return hasUploadedSource(state) || hasVerifiedUrlSource(state)
}

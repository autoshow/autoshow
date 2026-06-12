import type { StepsProps,UrlMetadata } from '~/types'
export type SourceRoutesCreateStepsComponentsStep1WrapperURLProps = {
  state: StepsProps['state']
  setState: StepsProps['setState']
  documentRuntimeCapabilities: StepsProps['documentRuntimeCapabilities']
  disabled: boolean | undefined
}

export type SourceRoutesCreateStepsComponentsStep1WrapperURLVerifyResponse = Partial<UrlMetadata> & { error?: string }

export type SourceRoutesCreateStepsComponentsStep1WrapperURLVerifyRequestState = {
  url: string
  controller: AbortController
  promise: Promise<SourceRoutesCreateStepsComponentsStep1WrapperURLVerifyResponse>
  result?: SourceRoutesCreateStepsComponentsStep1WrapperURLVerifyResponse
}

import type { SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate as CuratedModelCandidate,DocumentRuntimeCapabilities,SourceUtilsCostHelpersEstimatedDisplayCost as EstimatedDisplayCost,SupportedDocumentType } from '~/types'
export type SourceRoutesCreateStepsComponentsStep2WrapperDocumentProps = {
  documentType?: SupportedDocumentType | null
  documentRuntimeCapabilities?: DocumentRuntimeCapabilities | null
  documentService: string
  documentModel: string
  documentModelSelected: boolean
  selectDocumentModel: (service: string, model: string) => void
  disabled: boolean | undefined
}

export type SourceRoutesCreateStepsComponentsStep2WrapperDocumentDocumentCandidate = CuratedModelCandidate & {
  cost: EstimatedDisplayCost | null
}

import type { SupportedDocumentType,UrlMetadata } from '~/types'
export type SourceRoutesPresetsPresetsCompatibilitySource = {
  urlMetadata?: Partial<UrlMetadata> | null
  uploadId?: string
  uploadedFileName?: string
  documentType?: SupportedDocumentType | null
}

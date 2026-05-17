import type { SupportedDocumentType } from '~/types'
export type SourceModelsModelsConfigDocumentConfigDocumentPreprocessPlan =
  | {
    supported: true
    action: 'none' | 'convert-tiff-to-png' | 'extract-office-to-markdown'
    effectiveType: SupportedDocumentType
    inputMode: 'file' | 'text'
  }
  | {
    supported: false
    action: 'reject'
    reason: string
  }

import type { DocumentExtractionServiceType,DocumentRuntimeCapabilities,SupportedDocumentType } from '~/types'
export type SourceRoutesApiProcess02RunTranscribeDocumentServicesPreprocessDocumentPreprocessedDocumentDescriptor = {
  inputMode: 'file' | 'text'
  path?: string
  text?: string
  mimeType: string
  effectiveType: SupportedDocumentType
  originalType: SupportedDocumentType
  fileName: string
  pageCount: number
  cleanup: () => Promise<void>
}

export type SourceRoutesApiProcess02RunTranscribeDocumentServicesPreprocessDocumentPreprocessDocumentInput = {
  documentPath: string | null
  documentUrl: string | null
  documentType: SupportedDocumentType
  documentService: DocumentExtractionServiceType
  outputDir: string
  runtimeCapabilities?: DocumentRuntimeCapabilities | null
}

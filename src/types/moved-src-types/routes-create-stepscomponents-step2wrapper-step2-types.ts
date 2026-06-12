import type { DocumentRuntimeCapabilities,PresetRecord,SupportedDocumentType,UrlMetadata } from '~/types'
export type SourceRoutesCreateStepsComponentsStep2WrapperStep2Props = {
  transcriptionOption: string
  selectTranscriptionService: (service: string) => void
  disabled: boolean | undefined
  urlType?: string
  documentType?: SupportedDocumentType | null
  documentRuntimeCapabilities?: DocumentRuntimeCapabilities | null
  hasFile: boolean
  transcriptionModel: string
  transcriptionModelSelected: boolean
  selectTranscriptionModel: (service: string, model: string) => void
  documentService: string
  documentModel: string
  documentModelSelected: boolean
  selectDocumentModel: (service: string, model: string) => void
  uploadedFileName: string
  uploadedFileSize?: number | undefined
  durationSeconds?: number
  urlMetadata?: UrlMetadata | null
  stepNumber?: number
  compatiblePresets?: PresetRecord[] | undefined
  activePresetId?: string | null | undefined
  isLoadingPresets?: boolean | undefined
  presetError?: string | null | undefined
  onPresetApply?: ((preset: PresetRecord) => void) | undefined
}

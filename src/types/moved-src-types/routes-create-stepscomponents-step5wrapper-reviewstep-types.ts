import type { JSX } from 'solid-js'
import type { PresetCompatibilityKey,StepsState,SupportedDocumentType } from '~/types'
export type SourceRoutesCreateStepsComponentsStep5WrapperReviewStepProps = {
  state: StepsState
  documentType: SupportedDocumentType | null | undefined
  stepNumber?: number
  onPreviewReady: (ready: boolean) => void
  footerContent?: JSX.Element | undefined
  mode?: 'job' | 'preset' | 'append-assets' | undefined
  appendShowNoteId?: string | undefined
  compatibilityKey?: PresetCompatibilityKey | undefined
}

import type { Action } from '@solidjs/router'
import type { JSX } from 'solid-js'
import type { SetStoreFunction } from 'solid-js/store'
import type * as v from 'valibot'
import type { ProgressUpdateSchema } from '../schema/progress-types'
import type { MusicBitrateSchema,MusicSampleRateSchema } from '../schema/step-4-types'
import type { DocumentRuntimeCapabilities,PresetCompatibilityKey,PresetRecord,StepsState,SupportedDocumentType } from '../shared/shared-types'
import type { WizardStepId } from './frontend-types'

export type StepsProps = {
  state: StepsState
  setState: SetStoreFunction<StepsState>
  isProcessing: () => boolean
  canSubmit: () => boolean
  submitAction?: Action<[FormData], { jobId: string }> | undefined
  documentType?: SupportedDocumentType | null | undefined
  documentRuntimeCapabilities?: DocumentRuntimeCapabilities | null | undefined
  googleDriveImportConfigured?: boolean | undefined
  reviewFooter?: JSX.Element | undefined
  initialStepId?: WizardStepId | undefined
  mode?: 'job' | 'preset' | 'append-assets' | undefined
  appendShowNoteId?: string | undefined
  presetCompatibilityKey?: PresetCompatibilityKey | undefined
  presetSubmitLabel?: string | undefined
  onPresetSave?: (() => void | Promise<void>) | undefined
  compatiblePresets?: PresetRecord[] | undefined
  activePresetId?: string | null | undefined
  isLoadingPresets?: boolean | undefined
  presetError?: string | null | undefined
  onPresetApply?: ((preset: PresetRecord) => void) | undefined
}

export type ProgressUpdate = v.InferOutput<typeof ProgressUpdateSchema>
export type MusicSampleRate = v.InferOutput<typeof MusicSampleRateSchema>
export type MusicBitrate = v.InferOutput<typeof MusicBitrateSchema>

export type WizardStepMeta = {
  id: WizardStepId
  title: string
}

type PreviewBreakdown = {
  transcription: number
  document: number
  llm: number
  tts: number
  image: number
  music: number
  video: number
  total: number
}

export type PreviewResponse = {
  breakdown: PreviewBreakdown
}

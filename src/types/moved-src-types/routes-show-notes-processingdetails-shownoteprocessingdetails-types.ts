import type { ShowNote,ShowNoteAsset,ShowNoteStorageLink } from '~/types'
export type SourceRoutesShowNotesProcessingDetailsShowNoteProcessingDetailsProps = {
  note: ShowNote
  assets: ShowNoteAsset[]
  storageLinks: ShowNoteStorageLink[]
  formatFileSize: (bytes: number | null | undefined) => string
  formatProcessingTime: (ms: number | null | undefined) => string
  formatDuration: (seconds: number | null | undefined) => string
  formatMusicGenre: (genre: string | null | undefined) => string
}

export type SourceRoutesShowNotesProcessingDetailsShowNoteProcessingDetailsEstimatedProcessingBreakdown = {
  step2?: number
  step3?: number
  step4?: number
  total: number
}

import type { ShowNote } from '~/types'
export type SourceRoutesShowNotesHeaderShowNoteHeaderProps = {
  note: ShowNote
  formatDate: (timestamp: number) => string
  canManage: boolean
  addAssetsHref?: string | undefined
}

import type { ShowNote,ShowNoteAsset } from '~/types'
export type SourceDatabaseNotesShowNoteAccessShowNoteViewerAccess = {
  note: ShowNote
  assets: ShowNoteAsset[]
  isOwner: boolean
}

export type SourceDatabaseNotesShowNoteAccessPublicShowNoteSitemapEntry = {
  id: string
  lastModifiedAt: number
}

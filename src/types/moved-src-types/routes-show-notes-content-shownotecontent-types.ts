import type { RenderedAssetTextOutputMaps,RenderedTextOutputMap,ShowNote,ShowNoteAsset } from '~/types'
export type SourceRoutesShowNotesContentShowNoteContentProps = {
  note: ShowNote
  assets: ShowNoteAsset[]
  renderedTextOutput: RenderedTextOutputMap
  renderedAssetTextOutputs: RenderedAssetTextOutputMaps
  formatDuration: (seconds: number | null | undefined) => string
  formatMusicGenre: (genre: string | null | undefined) => string
  getAudioUrl: (id: string, audioFileName: string | null | undefined) => string
  getImageUrl: (id: string, imageFileName: string | null | undefined) => string
  getVideoUrl: (id: string, videoFileName: string | null | undefined) => string
  getImageFiles: (imageFilesString: string | null | undefined) => string[]
  getVideoFiles: (videoFilesString: string | null | undefined) => string[]
}

export type SourceDatabaseNotesCreateShowNoteAudioStep1Metadata = {
  videoPublishDate?: string
  videoThumbnail?: string
  channelUrl?: string
  audioFileName?: string
  audioFileSize?: number
  audioS3Url?: string
}

export type SourceDatabaseNotesCreateShowNoteAudioStep2Metadata = {
  transcriptionModel: string
  tokenCount?: number
  processingTime?: number
  totalCost?: number
}

export type SourceDatabaseNotesCreateShowNoteDocumentStep1Metadata = {
  documentType?: string
  pageCount?: number
}

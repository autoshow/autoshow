import type * as v from 'valibot'
import type { CommandResultSchema,ConvertToAudioResultSchema,DocumentMetadataSchema } from '../../schema/step-1-types'

export type DocumentMetadata = v.InferOutput<typeof DocumentMetadataSchema>
export type ConvertToAudioResult = v.InferOutput<typeof ConvertToAudioResultSchema>
export type CommandResult = v.InferOutput<typeof CommandResultSchema>

export type PipelineParams = {
  showNoteId: string
  jobId: string
  metadata: import('../../backend/backend-types').VideoMetadata
  step1Metadata: import('../../backend/backend-types').Step1Metadata | import('../../internal/internal-types').Step1DocumentMetadata
  transcriptionResult: {
    result: import('../../backend/backend-types').TranscriptionResult
    metadata: import('../../internal/internal-types').Step2CombinedMetadata
  }
  processingOptions: import('../../backend/backend-types').ProcessingOptions
  progressTracker: import('../../backend/backend-types').IProgressTracker
  backupMetadata?: import('../../backend/backend-types').DocumentBackupMetadata | null
}

import type * as v from 'valibot'
import type { PresetConfigSchema,PresetPatchBodySchema } from '../schema/preset-types'
import type {
AppendAssetsFormDataSchema,
ProcessingFormDataSchema,
ProcessingMetadataSchema,
ProcessingOptionsSchema
} from '../schema/process-types'
import type { ProgressStatusSchema } from '../schema/progress-types'
import type { S3UploadResultSchema } from '../schema/s3-types'
import type { Step1MetadataSchema,VideoMetadataSchema } from '../schema/step-1-types'
import type {
DocumentBackupMetadataSchema,
DocumentExtractionModelUnionSchema,
Step2DocumentMetadataSchema
} from '../schema/step-2-document-types'
import type {
DeapiStatusResponseSchema,
TranscriptionResultSchema,
TranscriptionServiceTypeSchema
} from '../schema/step-2-transcription-types'
import type { Step4MetadataSchema,Step5MetadataSchema } from '../schema/step-3-types'
import type {
MusicGenreSchema,
Step6MetadataSchema,
Step7MetadataSchema,
Step8MetadataSchema,
VideoSizeSchema
} from '../schema/step-4-types'

export type LogColors = {
  timestamp: string
  message: string
  debug: string
  info: string
  warn: string
  value: string
  jsonKey: string
  error: string
  fatal: string
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export type LogContext = {
  requestId?: string
  traceId?: string
  jobId?: string
  route?: string
  method?: string
  component?: string
}

export type StructuredLogError = {
  name?: string
  message?: string
  stack?: string
  cause?: unknown
}

export type StructuredLogRecord = {
  timestamp: string
  level: LogLevel
  message: string
  service: string
  environment: string
  version?: string
  host?: string
  pid?: number
  context?: LogContext
  data?: Record<string, unknown>
  error?: StructuredLogError
}

export type PresetConfig = v.InferOutput<typeof PresetConfigSchema>
export type PresetPatchBody = v.InferOutput<typeof PresetPatchBodySchema>
export type ProcessingMetadata = v.InferOutput<typeof ProcessingMetadataSchema>
export type ProcessingOptions = v.InferOutput<typeof ProcessingOptionsSchema>
export type ProcessingFormData = v.InferOutput<typeof ProcessingFormDataSchema>
export type AppendAssetsFormData = v.InferOutput<typeof AppendAssetsFormDataSchema>

export type AppendAssetsJobInput = ProcessingOptions & {
  appendMode: 'assets'
  showNoteId: string
}

export type CompletedPipelineResult = {
  showNoteId: string
  metadata: { url: string, title: string, author?: string, duration?: string }
  processingMetadata: ProcessingMetadata
  promptInstructions: string
  textOutput: string | null
  transcriptionText: string
  finalCostUsd: number
}

export interface IProgressTracker {
  updateStep(
    step: number,
    stepProgress: number,
    status: v.InferOutput<typeof ProgressStatusSchema>,
    message: string,
    subStep?: { current: number, total: number, description?: string },
    error?: string
  ): void
  startStep(step: number, message: string): void
  updateStepProgress(step: number, progress: number, message: string): void
  updateStepWithSubStep(
    step: number,
    current: number,
    total: number,
    description: string,
    message: string
  ): void
  completeStep(step: number, message: string): void
  skipStep(step: number): void
  error(step: number, message: string, error: string): void
  complete(showNoteId: string): void
}

export type S3UploadResult = v.InferOutput<typeof S3UploadResultSchema>
export type Step1Metadata = v.InferOutput<typeof Step1MetadataSchema>
export type VideoMetadata = v.InferOutput<typeof VideoMetadataSchema>
export type DocumentBackupMetadata = v.InferOutput<typeof DocumentBackupMetadataSchema>
export type DocumentExtractionModel = v.InferOutput<typeof DocumentExtractionModelUnionSchema>
export type Step2DocumentMetadata = v.InferOutput<typeof Step2DocumentMetadataSchema>
export type DeapiStatusResponse = v.InferOutput<typeof DeapiStatusResponseSchema>
export type TranscriptionResult = v.InferOutput<typeof TranscriptionResultSchema>
export type TranscriptionServiceType = v.InferOutput<typeof TranscriptionServiceTypeSchema>

export type PromptConfig = {
  title: string
  displayTitle: string
  category: 'Overviews' | 'Summaries' | 'Chapters' | 'Social Media Posts' | 'Creative Writing' | 'Marketing Content' | 'Educational' | 'Learning Resources' | 'Business Analysis' | 'Personal Growth'
  renderType: 'text' | 'stringList' | 'numberedList' | 'faq' | 'chapters'
  schema: {
    type: 'string' | 'array'
    items?: Record<string, unknown>
    description: string
  }
  inputTokens: number
  outputTokens: number
  llmInstruction: string
  markdownInstruction: string
  markdownExample: string
}

export type Step4Metadata = v.InferOutput<typeof Step4MetadataSchema>
export type Step5Metadata = v.InferOutput<typeof Step5MetadataSchema>
export type MusicGenre = v.InferOutput<typeof MusicGenreSchema>
export type Step6Metadata = v.InferOutput<typeof Step6MetadataSchema>
export type Step7Metadata = v.InferOutput<typeof Step7MetadataSchema>
export type Step8Metadata = v.InferOutput<typeof Step8MetadataSchema>
export type VideoSize = v.InferOutput<typeof VideoSizeSchema>

export type ResolvedUploadSource = {
  uploadId: string
  localFilePath: string
  localFileName: string
  localFileSize: number
  localFileDuration?: number
}

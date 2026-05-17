import type { SQL } from 'bun'
import type { ProcessJobProgressTracker } from '~/routes/api/process/01-dl-audio/process-job/progress-tracker'
import type { CompletedPipelineResult,ProcessingOptions } from '~/types'
export type SourceRoutesApiProcess01DlAudioProcessJobExecuteJobExecuteProcessingJobDependencies = {
  enforceSafeProcessingSources: (options: ProcessingOptions) => Promise<ProcessingOptions>
  processAudioSource: (
    options: ProcessingOptions,
    progressTracker: ProcessJobProgressTracker,
    jobId: string
  ) => Promise<CompletedPipelineResult>
  finalizeSuccessfulJob: (
    db: SQL,
    jobId: string,
    options: ProcessingOptions,
    pipelineResult: CompletedPipelineResult
  ) => Promise<void>
  sendCompletionNotification: (
    db: SQL,
    jobId: string,
    options: ProcessingOptions,
    showNoteId: string
  ) => Promise<void>
}

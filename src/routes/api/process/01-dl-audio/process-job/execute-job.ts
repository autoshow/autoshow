import type { SQL } from "bun"
import { completeJob,failJob,updateJobProgress } from "~/database/jobs/update-job"
import { createShowNote } from "~/database/notes/create-show-note"
import { runImmediateTransaction } from "~/database/transaction"
import { sendAdminNotification } from "~/routes/api/email/admin-notification/send-admin-notification"
import { enforceSafeProcessingSources } from "~/routes/api/process/form-helpers/security"
import type { CompletedPipelineResult,SourceRoutesApiProcess01DlAudioProcessJobExecuteJobExecuteProcessingJobDependencies as ExecuteProcessingJobDependencies,ProcessingOptions } from '~/types'
import { err,l } from "~/utils/logger/logging"
import { processDirectUrl } from "../direct-url/process-direct-url"
import { processDocument } from "../document/process-document"
import { processFile } from "../file/process-file"
import { processVideo } from "../video/process-video"
import { ProcessJobProgressTracker } from "./progress-tracker"

function getAdminShowNoteHTML(
  showNoteTitle: string,
  jobId: string,
  showNoteId: string,
  dateTime: string
): string {
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Show Note Generated</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr style="background: #f3f4f6;">
      <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Title</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${showNoteTitle}</td>
    </tr>
    <tr>
      <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Job ID</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${jobId}</td>
    </tr>
    <tr style="background: #f3f4f6;">
      <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Show Note ID</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${showNoteId}</td>
    </tr>
    <tr style="background: #f3f4f6;">
      <td style="padding: 12px; font-weight: bold; border: 1px solid #e5e7eb;">Date/Time</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${dateTime}</td>
    </tr>
  </table>
</div>
  `
}

const sendCompletionNotification = async (
  _db: SQL,
  jobId: string,
  options: ProcessingOptions,
  showNoteId: string
): Promise<void> => {
  const title = options.url || options.localFileName || "Untitled"

  await sendAdminNotification(
    "Show Note Generated",
    getAdminShowNoteHTML(title, jobId, showNoteId, new Date().toISOString())
  )
}

const processAudioSource = async (
  options: ProcessingOptions,
  progressTracker: ProcessJobProgressTracker,
  jobId: string
): Promise<CompletedPipelineResult> => {
  if (options.inputType === "document") {
    return processDocument(options, progressTracker, jobId)
  }

  if (options.isLocalFile && options.localFilePath && options.localFileName) {
    return processFile(options, progressTracker, jobId)
  }

  if (options.urlType === "direct-file" && options.useResilientDownload) {
    return processDirectUrl(options, progressTracker, jobId)
  }

  return processVideo(options, progressTracker, jobId)
}

const finalizeSuccessfulJob = async (
  db: SQL,
  jobId: string,
  options: ProcessingOptions,
  pipelineResult: CompletedPipelineResult
): Promise<void> => {
  await runImmediateTransaction(db, async () => {
    await createShowNote(
      db,
      pipelineResult.showNoteId,
      pipelineResult.metadata,
      options,
      pipelineResult.processingMetadata,
      pipelineResult.promptInstructions,
      pipelineResult.textOutput,
      pipelineResult.transcriptionText
    )

    await completeJob(db, jobId, pipelineResult.showNoteId)
  })
}

const defaultExecuteProcessingJobDependencies: ExecuteProcessingJobDependencies = {
  enforceSafeProcessingSources,
  processAudioSource,
  finalizeSuccessfulJob,
  sendCompletionNotification,
}

const executeProcessingJobWithDeps = async (
  db: SQL,
  jobId: string,
  options: ProcessingOptions,
  dependencies: ExecuteProcessingJobDependencies = defaultExecuteProcessingJobDependencies
): Promise<void> => {
  try {
    const securedOptions = await dependencies.enforceSafeProcessingSources(options)

    await updateJobProgress(db, jobId, {
      status: "processing",
      startedAt: Date.now(),
      updatedAt: Date.now(),
    })

    const progressTracker = new ProcessJobProgressTracker(
      db,
      jobId,
      {
        writeAndTtsSkipped: !securedOptions.llmEnabled,
        mediaSkipped:
          (!securedOptions.imageGenEnabled || !securedOptions.selectedImagePrompts?.length)
          && (!securedOptions.videoGenEnabled || !securedOptions.selectedVideoPrompts?.length)
          && (!securedOptions.musicGenEnabled || !securedOptions.selectedMusicGenre),
      }
    )

    const pipelineResult = await dependencies.processAudioSource(securedOptions, progressTracker, jobId)
    await dependencies.finalizeSuccessfulJob(db, jobId, securedOptions, pipelineResult)

    l("Job completed successfully", { jobId, showNoteId: pipelineResult.showNoteId })

    try {
      await dependencies.sendCompletionNotification(db, jobId, securedOptions, pipelineResult.showNoteId)
    } catch {}
  } catch (error) {
    err(`Job ${jobId} failed`, error)
    await failJob(db, jobId, error instanceof Error ? error.message : "Unknown error")
    throw error
  }
}

export const executeProcessingJob = async (
  db: SQL,
  jobId: string,
  options: ProcessingOptions
): Promise<void> => {
  return executeProcessingJobWithDeps(db, jobId, options)
}

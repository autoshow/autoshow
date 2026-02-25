import type { SQL } from "bun"
import { l, err, success } from "~/utils/logging"
import { getDatabase, initializeSchema } from "~/database/db"
import { updateJobProgress, failJob, completeJob } from "~/database/jobs/update-job"
import type { ProcessingOptions, ProgressStatus, IProgressTracker } from '~/types'
import { processDirectUrl } from './direct-url/process-direct-url'
import { processFile } from './file/process-file'
import { processVideo } from './video/process-video'
import { processDocument } from './document/process-document'

class ProgressTrackerClass implements IProgressTracker {
  private stepWeights: number[] = [12, 35, 5, 20, 5, 5, 5, 13]
  private stepNames: string[] = [
    'Download Audio',
    'Transcription',
    'Content Selection',
    'LLM Generation',
    'Text-to-Speech',
    'Image Generation',
    'Music Generation',
    'Video Generation'
  ]
  private ttsSkipped: boolean
  private imageGenSkipped: boolean
  private musicGenSkipped: boolean
  private videoGenSkipped: boolean
  private db: SQL
  private jobId: string

  constructor(
    db: SQL,
    jobId: string,
    ttsSkipped: boolean = false,
    imageGenSkipped: boolean = false,
    musicGenSkipped: boolean = false,
    videoGenSkipped: boolean = false
  ) {
    this.db = db
    this.jobId = jobId
    this.ttsSkipped = ttsSkipped
    this.imageGenSkipped = imageGenSkipped
    this.musicGenSkipped = musicGenSkipped
    this.videoGenSkipped = videoGenSkipped
  }

  private calculateOverallProgress(step: number, stepProgress: number): number {
    const completedWeight = this.stepWeights.slice(0, step).reduce((sum, w) => sum + w, 0)
    const currentWeight = (this.stepWeights[step] || 0) * (stepProgress / 100)
    return Math.min(100, Math.round(completedWeight + currentWeight))
  }

  private shouldSkipStep(step: number): boolean {
    if (step === 5 && this.ttsSkipped) return true
    if (step === 6 && this.imageGenSkipped) return true
    if (step === 7 && this.musicGenSkipped) return true
    if (step === 8 && this.videoGenSkipped) return true
    return false
  }

  private async saveProgress(
    step: number,
    stepProgress: number,
    status: ProgressStatus,
    message: string
  ): Promise<void> {
    try {
      await updateJobProgress(this.db, this.jobId, {
        status: status === 'error' ? 'error' : 'processing',
        currentStep: step,
        stepName: this.stepNames[step - 1] || 'Processing',
        stepProgress: Math.min(100, Math.max(0, stepProgress)),
        overallProgress: this.calculateOverallProgress(step - 1, stepProgress),
        message,
        updatedAt: Date.now()
      })
    } catch {
    }
  }

  public updateStep(
    step: number,
    stepProgress: number,
    status: ProgressStatus,
    message: string,
    _subStep?: { current: number; total: number; description?: string },
    _error?: string
  ): void {
    this.saveProgress(step, stepProgress, status, message)
  }

  public startStep(step: number, message: string): void {
    if (this.shouldSkipStep(step)) {
      this.skipStep(step)
    } else {
      this.updateStep(step, 0, 'processing', message)
    }
  }

  public updateStepProgress(step: number, progress: number, message: string): void {
    this.updateStep(step, progress, 'processing', message)
  }

  public updateStepWithSubStep(
    step: number,
    current: number,
    total: number,
    description: string,
    message: string
  ): void {
    const stepProgress = Math.round((current / total) * 100)
    this.updateStep(step, stepProgress, 'processing', message, { current, total, description })
  }

  public completeStep(step: number, message: string): void {
    this.updateStep(step, 100, 'completed', message)
  }

  public skipStep(step: number): void {
    const stepName = this.stepNames[step - 1] || 'Step'
    this.updateStep(step, 100, 'skipped', `${stepName} skipped`)
  }

  public error(step: number, message: string, _error: string): void {
    this.updateStep(step, 0, 'error', message)
  }

  public async complete(showNoteId: string): Promise<void> {
    try {
      await completeJob(this.db, this.jobId, showNoteId)
    } catch {
    }
  }
}

const processAudio = async (
  options: ProcessingOptions,
  progressTracker: ProgressTrackerClass,
  jobId: string
): Promise<string> => {
  l('Step 1: Download', {
    inputType: options.inputType || 'url',
    urlType: options.urlType,
    isLocalFile: options.isLocalFile || false
  })

  if (options.inputType === 'document') {
    l('Routing to document processing', {
      localFilePath: options.localFilePath,
      documentUrl: options.documentUrl,
      documentModel: options.documentModel
    })
    return await processDocument(options, progressTracker, jobId)
  }

  if (options.isLocalFile && options.localFilePath && options.localFileName) {
    l('Routing to local file processing', { localFilePath: options.localFilePath })
    return await processFile(options, progressTracker, jobId)
  }

  if (options.urlType === 'direct-file' && options.useResilientDownload) {
    l('Routing to direct URL processing', { url: options.url })
    return await processDirectUrl(options, progressTracker, jobId)
  }

  l('Routing to video URL processing', { url: options.url, urlType: options.urlType })
  return await processVideo(options, progressTracker, jobId)
}

export function processJobInBackground(jobId: string, options: ProcessingOptions): void {
  setImmediate(async () => {
    const db = getDatabase()
    await initializeSchema(db)

    try {
      await updateJobProgress(db, jobId, {
        status: 'processing',
        startedAt: Date.now(),
        updatedAt: Date.now()
      })

      l('Job started processing', { jobId })

      const progressTracker = new ProgressTrackerClass(
        db,
        jobId,
        !options.ttsEnabled,
        !options.imageGenEnabled,
        !options.musicGenEnabled,
        !options.videoGenEnabled
      )

      const showNoteId = await processAudio(options, progressTracker, jobId)

      await progressTracker.complete(showNoteId)

      success('Job completed successfully', { jobId, showNoteId })

    } catch (error) {
      err(`Job ${jobId} failed`, error)
      await failJob(db, jobId, error instanceof Error ? error.message : 'Unknown error')
    }
  })
}

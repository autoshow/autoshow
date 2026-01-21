import type { Database } from "bun:sqlite"
import { l, err, success } from "~/utils/logging"
import { getDatabase, initializeSchema } from "~/database/db"
import { updateJobProgress, failJob, completeJob } from "~/database/jobs"
import type { ProcessingOptions, ProgressStatus, IProgressTracker } from '~/types/main'
import { processDirectUrl } from './process-direct-url'
import { processFile } from './process-file'
import { processVideo } from './process-video'

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
  private db: Database
  private jobId: string

  constructor(
    db: Database,
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

  private saveProgress(
    step: number,
    stepProgress: number,
    status: ProgressStatus,
    message: string
  ): void {
    try {
      updateJobProgress(this.db, this.jobId, {
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

  public complete(showNoteId: string): void {
    try {
      completeJob(this.db, this.jobId, showNoteId)
    } catch {
    }
  }
}

const processAudio = async (
  options: ProcessingOptions,
  progressTracker: ProgressTrackerClass
): Promise<string> => {
  if (options.isLocalFile && options.localFilePath && options.localFileName) {
    l('Routing to local file processing', { localFilePath: options.localFilePath })
    return await processFile(options, progressTracker)
  }
  
  if (options.urlType === 'direct-file' && options.useResilientDownload) {
    l('Routing to direct URL processing', { url: options.url })
    return await processDirectUrl(options, progressTracker)
  }
  
  l('Routing to video URL processing', { url: options.url, urlType: options.urlType })
  return await processVideo(options, progressTracker)
}

export function processJobInBackground(jobId: string, options: ProcessingOptions): void {
  setImmediate(async () => {
    const db = getDatabase()
    initializeSchema(db)
    
    try {
      updateJobProgress(db, jobId, {
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
      
      const showNoteId = await processAudio(options, progressTracker)
      
      progressTracker.complete(showNoteId)
      
      success('Job completed successfully', { jobId, showNoteId })
      
    } catch (error) {
      err(`Job ${jobId} failed`, error)
      failJob(db, jobId, error instanceof Error ? error.message : 'Unknown error')
    }
  })
}

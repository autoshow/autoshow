import type { SQL } from "bun"
import { completeJob,failJob,updateJobProgress } from "~/database/jobs/update-job"
import type { IProgressTracker,SourceRoutesApiProcess01DlAudioProcessJobProgressTrackerProcessJobProgressTrackerOptions as ProcessJobProgressTrackerOptions,ProgressStatus } from '~/types'
import { JOB_PROGRESS_STEP_NAMES,JOB_PROGRESS_STEP_NUMBERS,JOB_PROGRESS_STEP_WEIGHTS,getJobProgressStepName } from "~/utils/job-progress"
import { err } from "~/utils/logger/logging"

const getJobProgressStage = (step: number): { weight: number } | null => {
  const weight = JOB_PROGRESS_STEP_WEIGHTS[step - 1]
  return weight === undefined ? null : { weight }
}

export class ProcessJobProgressTracker implements IProgressTracker {
  private stepWeights: number[] = [...JOB_PROGRESS_STEP_WEIGHTS]
  private stepNames: string[] = [...JOB_PROGRESS_STEP_NAMES]
  private skippedSteps: Set<number>
  private db: SQL
  private jobId: string
  private saveQueue: Promise<void> = Promise.resolve()
  private lastUpdatedAt = 0

  constructor(db: SQL, jobId: string, options: ProcessJobProgressTrackerOptions = {}) {
    this.db = db
    this.jobId = jobId
    this.skippedSteps = new Set<number>([
      ...(options.writeAndTtsSkipped ? [JOB_PROGRESS_STEP_NUMBERS.writeAndTts] : []),
      ...(options.mediaSkipped ? [JOB_PROGRESS_STEP_NUMBERS.media] : []),
    ])
  }

  private calculateOverallProgress(step: number, stepProgress: number): number {
    const completedWeight = this.stepWeights
      .slice(0, Math.max(0, step - 1))
      .reduce((sum, weight) => sum + weight, 0)
    const currentWeight = (getJobProgressStage(step)?.weight ?? 0) * (stepProgress / 100)
    return Math.min(100, Math.round(completedWeight + currentWeight))
  }

  private shouldSkipStep(step: number): boolean {
    return this.skippedSteps.has(step)
  }

  private async saveProgress(
    step: number,
    stepProgress: number,
    status: ProgressStatus,
    message: string
  ): Promise<void> {
    const updatedAt = this.getNextUpdatedAt()

    try {
      await updateJobProgress(this.db, this.jobId, {
        status: status === "error" ? "error" : "processing",
        currentStep: step,
        stepName: getJobProgressStepName(step) || "Processing",
        stepProgress: Math.min(100, Math.max(0, stepProgress)),
        overallProgress: this.calculateOverallProgress(step, stepProgress),
        message,
        updatedAt,
      })
    } catch (error) {
      err(`Failed to save progress for job ${this.jobId}`, error)
    }
  }

  private getNextUpdatedAt(): number {
    const now = Date.now()
    this.lastUpdatedAt = Math.max(now, this.lastUpdatedAt + 1)
    return this.lastUpdatedAt
  }

  private queueSaveProgress(
    step: number,
    stepProgress: number,
    status: ProgressStatus,
    message: string
  ): void {
    this.saveQueue = this.saveQueue
      .catch((error) => {
        err(`Progress queue error for job ${this.jobId}`, error)
      })
      .then(async () => {
        await this.saveProgress(step, stepProgress, status, message)
      })
  }

  public updateStep(
    step: number,
    stepProgress: number,
    status: ProgressStatus,
    message: string,
    _subStep?: { current: number; total: number; description?: string },
    _error?: string
  ): void {
    this.queueSaveProgress(step, stepProgress, status, message)
  }

  public startStep(step: number, message: string): void {
    if (this.shouldSkipStep(step)) {
      this.skipStep(step)
      return
    }

    this.updateStep(step, 0, "processing", message)
  }

  public updateStepProgress(step: number, progress: number, message: string): void {
    this.updateStep(step, progress, "processing", message)
  }

  public updateStepWithSubStep(
    step: number,
    current: number,
    total: number,
    description: string,
    message: string
  ): void {
    const stepProgress = Math.round((current / total) * 100)
    this.updateStep(step, stepProgress, "processing", message, { current, total, description })
  }

  public completeStep(step: number, message: string): void {
    this.updateStep(step, 100, "completed", message)
  }

  public skipStep(step: number): void {
    const stepName = getJobProgressStepName(step) || this.stepNames[step - 1] || "Step"
    this.updateStep(step, 100, "skipped", `${stepName} skipped`)
  }

  public error(step: number, message: string, error: string): void {
    this.updateStep(step, 0, "error", message)
    failJob(this.db, this.jobId, error).catch((failErr) => {
      err(`Failed to persist error for job ${this.jobId}`, failErr)
    })
  }

  public async complete(showNoteId: string): Promise<void> {
    await this.saveQueue.catch((error) => {
      err(`Progress queue error during completion for job ${this.jobId}`, error)
    })

    try {
      await completeJob(this.db, this.jobId, showNoteId)
    } catch (error) {
      err(`Failed to complete job ${this.jobId}`, error)
    }
  }
}

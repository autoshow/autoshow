import type { IProgressTracker,ProgressStatus } from '~/types'

type RecoverableAttemptProgressTrackerOptions = {
  fallbackMessage?: string
}

const DEFAULT_FALLBACK_MESSAGE = 'Trying another provider'

const clampProgress = (progress: number): number => {
  return Math.max(0, Math.min(100, progress))
}

export const createRecoverableAttemptProgressTracker = (
  baseTracker: IProgressTracker | undefined,
  options: RecoverableAttemptProgressTrackerOptions = {}
): IProgressTracker | undefined => {
  if (!baseTracker) return undefined

  let lastProgress: { step: number, progress: number } | null = null
  const fallbackMessage = options.fallbackMessage ?? DEFAULT_FALLBACK_MESSAGE

  const rememberProgress = (step: number, progress: number): void => {
    lastProgress = { step, progress: clampProgress(progress) }
  }

  const reportRecoverableError = (step: number): void => {
    const progress = lastProgress?.step === step ? lastProgress.progress : 0
    baseTracker.updateStep(step, progress, 'processing', fallbackMessage)
  }

  return {
    updateStep(step, stepProgress, status: ProgressStatus, message, subStep, error) {
      if (status === 'error') {
        reportRecoverableError(step)
        return
      }

      rememberProgress(step, stepProgress)
      baseTracker.updateStep(step, stepProgress, status, message, subStep, error)
    },
    startStep(step, message) {
      rememberProgress(step, 0)
      baseTracker.startStep(step, message)
    },
    updateStepProgress(step, progress, message) {
      rememberProgress(step, progress)
      baseTracker.updateStepProgress(step, progress, message)
    },
    updateStepWithSubStep(step, current, total, description, message) {
      const progress = total > 0 ? Math.round((current / total) * 100) : 0
      rememberProgress(step, progress)
      baseTracker.updateStepWithSubStep(step, current, total, description, message)
    },
    completeStep(step, message) {
      rememberProgress(step, 100)
      baseTracker.completeStep(step, message)
    },
    skipStep(step) {
      rememberProgress(step, 100)
      baseTracker.skipStep(step)
    },
    error(step) {
      reportRecoverableError(step)
    },
    complete(showNoteId) {
      baseTracker.complete(showNoteId)
    }
  }
}

import type { IProgressTracker,SourceRoutesApiProcessSharedRangedProgressTrackerProgressRange as ProgressRange,ProgressStatus } from '~/types'

const clampProgress = (value: number): number => {
  return Math.max(0, Math.min(100, value))
}

const mapProgress = (range: ProgressRange, progress: number): number => {
  const clamped = clampProgress(progress)
  const span = range.end - range.start
  return Math.round(range.start + ((clamped / 100) * span))
}

const normalizeStatus = (status: ProgressStatus): ProgressStatus => {
  return status === 'error' ? 'error' : 'processing'
}

export const createRangedProgressTracker = (
  baseTracker: IProgressTracker,
  range: ProgressRange
): IProgressTracker => {
  return {
    updateStep(_step, stepProgress, status, message, subStep, error) {
      if (status === 'error') {
        baseTracker.error(range.step, message, error ?? message)
        return
      }

      baseTracker.updateStep(
        range.step,
        mapProgress(range, stepProgress),
        normalizeStatus(status),
        message,
        subStep,
        error
      )
    },
    startStep(_step, message) {
      baseTracker.updateStep(range.step, range.start, 'processing', message)
    },
    updateStepProgress(_step, progress, message) {
      baseTracker.updateStep(range.step, mapProgress(range, progress), 'processing', message)
    },
    updateStepWithSubStep(_step, current, total, description, message) {
      const progress = total > 0 ? Math.round((current / total) * 100) : 0
      baseTracker.updateStep(
        range.step,
        mapProgress(range, progress),
        'processing',
        message,
        { current, total, description }
      )
    },
    completeStep(_step, message) {
      baseTracker.updateStep(range.step, range.end, 'processing', message)
    },
    skipStep(_step) {
      baseTracker.updateStep(range.step, range.end, 'processing', 'Sub-step skipped')
    },
    error(_step, message, error) {
      baseTracker.error(range.step, message, error)
    },
    complete(showNoteId) {
      baseTracker.complete(showNoteId)
    }
  }
}

export const buildSequentialProgressRanges = (
  step: number,
  segmentCount: number
): ProgressRange[] => {
  if (segmentCount <= 0) {
    return []
  }

  return Array.from({ length: segmentCount }, (_, index) => {
    const start = Math.round((index / segmentCount) * 100)
    const end = Math.round(((index + 1) / segmentCount) * 100)
    return { step, start, end }
  })
}

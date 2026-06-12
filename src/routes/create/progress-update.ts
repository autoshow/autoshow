import type { Job,ProgressUpdate } from "~/types"

function getSkippedSteps(job: Job): number[] | undefined {
  try {
    const input = JSON.parse(job.inputData) as { appendMode?: unknown }
    if (input.appendMode === 'assets') {
      return [1, 2]
    }
  } catch {
  }

  return undefined
}

export function jobToProgressUpdate(job: Job | null): ProgressUpdate | null {
  if (!job) return null
  return {
    step: job.currentStep,
    stepName: job.stepName || '',
    stepProgress: job.stepProgress,
    overallProgress: job.overallProgress,
    status: job.status === 'error' ? 'error' :
            job.status === 'completed' ? 'completed' : 'processing',
    message: job.message || '',
    error: job.status === 'error' ? job.error || undefined : undefined,
    showNoteId: job.showNoteId || undefined,
    skippedSteps: getSkippedSteps(job)
  }
}

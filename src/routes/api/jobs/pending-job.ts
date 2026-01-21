const STORAGE_KEY = 'pendingJobId'

export function savePendingJob(jobId: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, jobId)
  }
}

export function getPendingJob(): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY)
  }
  return null
}

export function clearPendingJob(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

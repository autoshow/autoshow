import type { ProcessingOptions } from '~/types'
import { getDatabase, initializeSchema } from '~/database/db'
import { createJob } from '~/database/jobs/create-job'
import { processJobInBackground } from '../01-dl-audio/process-job'

export const generateJobId = (): string => {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export const createAndDispatchJob = async (options: ProcessingOptions): Promise<string> => {
  const jobId = generateJobId()
  const db = getDatabase()
  await initializeSchema(db)

  await createJob(db, jobId, {
    status: 'pending',
    inputData: JSON.stringify(options),
    createdAt: Date.now()
  })

  processJobInBackground(jobId, options)

  return jobId
}

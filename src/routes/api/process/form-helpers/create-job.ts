import { getDatabase,initializeSchema } from '~/database/db'
import { createJob } from '~/database/jobs/create-job'
import type { ProcessingOptions } from '~/types'
import { err,withLogContext } from '~/utils/logger/logging'
import { executeProcessingJob } from '../01-dl-audio/process-job/execute-job'

const generateJobId = (): string => {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

const processJobInBackground = (jobId: string, options: ProcessingOptions): void => {
  setImmediate(() => {
    void withLogContext({ jobId, component: 'pipeline' }, async () => {
      const db = getDatabase()

      try {
        await initializeSchema(db)
      } catch (error) {
        err(`Background job ${jobId} failed before execution`, error)
        return
      }

      try {
        await executeProcessingJob(db, jobId, options)
      } catch {
      }
    })
  })
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

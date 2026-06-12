import { getDatabase,initializeSchema } from "~/database/db"
import { createJob } from "~/database/jobs/create-job"
import type { AppendAssetsJobInput } from "~/types"
import { err,withLogContext } from "~/utils/logger/logging"
import { executeAppendAssetsJob } from "./execute-append-assets-job"

const generateJobId = (): string => {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

const processAppendJobInBackground = (jobId: string, input: AppendAssetsJobInput): void => {
  setImmediate(() => {
    void withLogContext({ jobId, component: 'append-assets' }, async () => {
      const db = getDatabase()

      try {
        await initializeSchema(db)
      } catch (error) {
        err(`Append assets job ${jobId} failed before execution`, error)
        return
      }

      try {
        await executeAppendAssetsJob(db, jobId, input)
      } catch {
      }
    })
  })
}

export const createAndDispatchAppendAssetsJob = async (
  input: AppendAssetsJobInput
): Promise<string> => {
  const jobId = generateJobId()
  const db = getDatabase()
  await initializeSchema(db)

  await createJob(db, jobId, {
    status: 'pending',
    inputData: JSON.stringify(input),
    createdAt: Date.now()
  })

  processAppendJobInBackground(jobId, input)

  return jobId
}

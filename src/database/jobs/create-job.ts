import type { SQL } from "bun"
import { CreateJobInputSchema, validateOrThrow } from "~/types"

export const createJob = async (db: SQL, id: string, input: unknown): Promise<void> => {
  const validInput = validateOrThrow(CreateJobInputSchema, input, 'Invalid job creation input')

  await db`
    INSERT INTO jobs (id, status, input_data, created_at, updated_at)
    VALUES (${id}, ${validInput.status}, ${validInput.inputData}, ${validInput.createdAt}, ${validInput.createdAt})
  `
}

import type { APIEvent } from "@solidjs/start/server"
import * as v from 'valibot'
import { getDatabase, initializeSchema } from "~/database/db"
import { getJobById } from "~/database/jobs"
import { JobIdParamSchema, validationErrorResponse } from '~/types/main'

export async function GET({ params }: APIEvent) {
  const idResult = v.safeParse(JobIdParamSchema, params.id)
  
  if (!idResult.success) {
    return validationErrorResponse(idResult.issues)
  }
  
  const jobId = idResult.output
  
  const db = getDatabase()
  initializeSchema(db)
  
  const job = getJobById(db, jobId)
  
  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }
  
  return Response.json(job)
}

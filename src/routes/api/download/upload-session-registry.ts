import { mkdir,rm } from 'node:fs/promises'
import { join,resolve } from 'node:path'
import * as v from 'valibot'
import { DirectUploadSessionSchema,type DirectUploadSession } from '~/types'
import { UPLOAD_SESSIONS_ROOT } from './upload-paths'

const UPLOAD_SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

const assertSafeUploadSessionId = (uploadSessionId: string): void => {
  if (!UPLOAD_SESSION_ID_PATTERN.test(uploadSessionId)) {
    throw new Error('Invalid upload session ID')
  }
}

const getUploadSessionPath = (uploadSessionId: string): string => {
  assertSafeUploadSessionId(uploadSessionId)
  return join(resolve(UPLOAD_SESSIONS_ROOT), `${uploadSessionId}.json`)
}

const parseDirectUploadSession = (input: unknown): DirectUploadSession => {
  const result = v.safeParse(DirectUploadSessionSchema, input)
  if (!result.success) {
    throw new Error('Invalid upload session')
  }
  return result.output
}

export const writeDirectUploadSession = async (
  session: DirectUploadSession
): Promise<DirectUploadSession> => {
  await mkdir(resolve(UPLOAD_SESSIONS_ROOT), { recursive: true })
  await Bun.write(
    getUploadSessionPath(session.uploadSessionId),
    `${JSON.stringify(session, null, 2)}\n`
  )
  return session
}

export const readDirectUploadSession = async (
  uploadSessionId: string
): Promise<DirectUploadSession | null> => {
  const file = Bun.file(getUploadSessionPath(uploadSessionId))
  if (!(await file.exists())) {
    return null
  }

  return parseDirectUploadSession(await file.json())
}

export const deleteDirectUploadSession = async (
  uploadSessionId: string
): Promise<void> => {
  await rm(getUploadSessionPath(uploadSessionId), { force: true })
}

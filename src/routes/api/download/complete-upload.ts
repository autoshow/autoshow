import { json } from '@solidjs/router'
import type { APIEvent } from '@solidjs/start/server'
import * as v from 'valibot'
import { CompleteUploadRequestSchema,validationErrorResponse } from '~/types'
import { err } from '~/utils/logger/logging'
import { buildS3Url,isS3Configured,statS3Object } from '~/utils/s3-utils'
import { writeUploadRegistryEntry } from './upload-registry'
import { deleteDirectUploadSession,readDirectUploadSession } from './upload-session-registry'
import {
  enforceUploadRequestPolicy,
  ensureSimpleUploadAllowed,
  ensureValidUploadFileName
} from './upload-security'

export async function POST({ request }: APIEvent) {
  try {
    try {
      await enforceUploadRequestPolicy(request.headers, 'direct')
    } catch (rateLimitError) {
      return json(
        { error: rateLimitError instanceof Error ? rateLimitError.message : 'Too many upload requests' },
        { status: 429 }
      )
    }

    const rawBody = await request.json().catch(() => null)
    const bodyResult = v.safeParse(CompleteUploadRequestSchema, rawBody)
    if (!bodyResult.success) {
      return validationErrorResponse(bodyResult.issues)
    }

    const { uploadSessionId, objectKey, fileName, fileSize } = bodyResult.output

    try {
      ensureValidUploadFileName(fileName)
      ensureSimpleUploadAllowed(fileSize)
    } catch (validationError) {
      const message = validationError instanceof Error ? validationError.message : 'Upload rejected'
      const status = message.includes('size') || message.includes('File exceeds') ? 413 : 400
      return json({ error: message }, { status })
    }

    if (!isS3Configured()) {
      return json({ error: 'Direct bucket uploads are not configured' }, { status: 503 })
    }

    const session = await readDirectUploadSession(uploadSessionId)
    if (!session) {
      return json({ error: 'Upload session not found' }, { status: 404 })
    }

    if (session.expiresAt < Date.now()) {
      await deleteDirectUploadSession(uploadSessionId).catch(() => {})
      return json({ error: 'Upload session expired' }, { status: 410 })
    }

    if (
      session.objectKey !== objectKey ||
      session.fileName !== fileName ||
      session.fileSize !== fileSize
    ) {
      return json({ error: 'Upload completion metadata does not match the upload session' }, { status: 403 })
    }

    const objectStat = await statS3Object(objectKey)
    if (!objectStat) {
      return json({ error: 'Uploaded object not found in storage bucket' }, { status: 404 })
    }

    if (objectStat.size !== fileSize) {
      return json({ error: 'Uploaded object size does not match the requested file size' }, { status: 409 })
    }

    const uploadRef = await writeUploadRegistryEntry({
      storage: 's3',
      originalFileName: fileName,
      objectKey,
      bucketUrl: buildS3Url(objectKey),
      fileSize
    })

    await deleteDirectUploadSession(uploadSessionId).catch(() => {})

    return json({
      success: true,
      uploadId: uploadRef.uploadId,
      fileName: uploadRef.originalFileName,
      fileSize
    })
  } catch (error) {
    err('Failed to complete direct upload', error)
    return json({ error: 'Failed to complete direct upload' }, { status: 500 })
  }
}

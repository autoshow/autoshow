import { json } from '@solidjs/router'
import type { APIEvent } from '@solidjs/start/server'
import * as v from 'valibot'
import { CreateUploadUrlRequestSchema,validationErrorResponse } from '~/types'
import { err } from '~/utils/logger/logging'
import { createPresignedPutUrl,isS3Configured } from '~/utils/s3-utils'
import { writeDirectUploadSession } from './upload-session-registry'
import {
  buildDirectUploadObjectKey,
  createUploadSessionId,
  enforceUploadRequestPolicy,
  ensureSimpleUploadAllowed,
  ensureValidUploadFileName,
  normalizeUploadContentType
} from './upload-security'

const PRESIGNED_UPLOAD_EXPIRES_SECONDS = 15 * 60

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
    const bodyResult = v.safeParse(CreateUploadUrlRequestSchema, rawBody)
    if (!bodyResult.success) {
      return validationErrorResponse(bodyResult.issues)
    }

    const { fileName, fileSize } = bodyResult.output
    let contentType: string

    try {
      ensureValidUploadFileName(fileName)
      ensureSimpleUploadAllowed(fileSize)
      contentType = normalizeUploadContentType(bodyResult.output.contentType)
    } catch (validationError) {
      const message = validationError instanceof Error ? validationError.message : 'Upload rejected'
      const status = message.includes('size') || message.includes('File exceeds') ? 413 : 400
      return json({ error: message }, { status })
    }

    if (!isS3Configured()) {
      return json({ error: 'Direct bucket uploads are not configured' }, { status: 503 })
    }

    const uploadSessionId = createUploadSessionId()
    const objectKey = buildDirectUploadObjectKey(uploadSessionId, fileName)
    const expiresAt = Date.now() + PRESIGNED_UPLOAD_EXPIRES_SECONDS * 1000
    const uploadUrl = createPresignedPutUrl(objectKey, contentType, PRESIGNED_UPLOAD_EXPIRES_SECONDS)

    await writeDirectUploadSession({
      uploadSessionId,
      objectKey,
      fileName,
      fileSize,
      contentType,
      expiresAt,
      createdAt: Date.now()
    })

    return json({
      uploadSessionId,
      uploadUrl,
      objectKey,
      expiresAt
    })
  } catch (error) {
    err('Failed to create direct upload URL', error)
    return json({ error: 'Failed to create direct upload URL' }, { status: 500 })
  }
}

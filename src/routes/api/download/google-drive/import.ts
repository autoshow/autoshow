import { json } from '@solidjs/router'
import type { APIEvent } from '@solidjs/start/server'
import { mkdir } from 'node:fs/promises'
import * as v from 'valibot'
import { GoogleDriveImportRequestSchema,validationErrorResponse } from '~/types'
import { getDuration } from '~/routes/api/process/01-dl-audio/dl-utils'
import { err } from '~/utils/logger/logging'
import { writeUploadRegistryEntry } from '../upload-registry'
import {
  UPLOAD_LIMITS,
  UPLOAD_ROOT,
  enforceUploadRequestPolicy,
  sanitizeUploadSegment,
} from '../upload-security'
import {
  GoogleDriveImportError,
  importGoogleDriveFile,
  normalizeGoogleDriveFileName,
} from './google-drive-import'

const getBearerToken = (request: Request): string | null => {
  const authorization = request.headers.get('authorization')?.trim()
  if (!authorization) return null

  const [scheme, token] = authorization.split(/\s+/, 2)
  if (scheme?.toLowerCase() !== 'bearer' || !token?.trim()) {
    return null
  }

  return token.trim()
}

export async function POST({ request }: APIEvent) {
  try {
    const accessToken = getBearerToken(request)
    if (!accessToken) {
      return json({ error: 'Google Drive access token is required' }, { status: 401 })
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim()
    if (!clientId) {
      return json({ error: 'Google Drive import is not configured' }, { status: 503 })
    }

    try {
      await enforceUploadRequestPolicy(request.headers, 'simple')
    } catch (rateLimitError) {
      return json(
        { error: rateLimitError instanceof Error ? rateLimitError.message : 'Too many upload requests' },
        { status: 429 }
      )
    }

    const rawBody = await request.json().catch(() => null)
    const bodyResult = v.safeParse(GoogleDriveImportRequestSchema, rawBody)
    if (!bodyResult.success) {
      return validationErrorResponse(bodyResult.issues)
    }

    await mkdir(UPLOAD_ROOT, { recursive: true })

    const requestFileName = normalizeGoogleDriveFileName(bodyResult.output.name, undefined)
    const storedFileName = `${Date.now()}_${sanitizeUploadSegment(requestFileName, 200)}`
    const destinationPath = `${UPLOAD_ROOT}/${storedFileName}`
    const importResult = await importGoogleDriveFile({
      accessToken,
      clientId,
      fileId: bodyResult.output.fileId,
      destinationPath,
      maxBytes: UPLOAD_LIMITS.maxUploadBytes,
      resourceKey: bodyResult.output.resourceKey,
    })

    const duration = await getDuration(importResult.storedFilePath)
    const uploadRef = await writeUploadRegistryEntry({
      originalFileName: importResult.fileName,
      storedFilePath: importResult.storedFilePath,
      fileSize: importResult.fileSize,
      ...(duration !== undefined ? { duration } : {}),
    })

    return json({
      success: true,
      uploadId: uploadRef.uploadId,
      fileName: uploadRef.originalFileName,
      fileSize: importResult.fileSize,
      ...(duration !== undefined ? { duration } : {}),
      ...(importResult.documentType !== undefined ? { documentType: importResult.documentType } : {}),
    })
  } catch (error) {
    if (error instanceof GoogleDriveImportError) {
      return json({ error: error.message }, { status: error.status })
    }

    err('Failed to import Google Drive file', error)
    return json({ error: 'Failed to import Google Drive file' }, { status: 500 })
  }
}

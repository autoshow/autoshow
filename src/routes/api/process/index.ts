import type { APIEvent } from "@solidjs/start/server"
import { resolveUpload } from '~/routes/api/download/upload-registry'
import { validationErrorResponse } from "~/types"
import { estimateTotalCost } from "~/utils/cost/cost-estimation"
import { err } from "~/utils/logger/logging"
import { getRateLimitClientIp,logSecurityEvent } from '~/utils/security/rate-limit'
import {
createAndDispatchJob,
enforceSafeProcessingSources,
getLegacyUploadFieldError,
parseProcessingFormData,
prepareProcessingOptions
} from "./form-helpers"
import { hydrateYouTubeProcessingDuration } from './form-helpers/youtube-duration'

export async function POST({ request }: APIEvent) {
  try {
    const formData = await request.formData()
    const legacyUploadFieldError = getLegacyUploadFieldError({
      uploadedFilePath: formData.get('uploadedFilePath'),
      uploadedFileName: formData.get('uploadedFileName'),
    })
    if (legacyUploadFieldError) {
      return Response.json({ error: legacyUploadFieldError }, { status: 400 })
    }

    const formResult = parseProcessingFormData(formData)
    if (!formResult.success) {
      return validationErrorResponse(formResult.issues)
    }

    let resolvedUpload
    if (formResult.output.uploadId) {
      try {
        resolvedUpload = await resolveUpload(formResult.output.uploadId)
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : 'Invalid upload reference' },
          { status: 400 }
        )
      }
    }

    let options
    try {
      options = prepareProcessingOptions(formResult.output, resolvedUpload)
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Invalid processing options' },
        { status: 400 }
      )
    }

    try {
      options = await enforceSafeProcessingSources(options)
    } catch (error) {
      const clientIp = getRateLimitClientIp(request.headers)
      logSecurityEvent({
        eventType: 'security:url-blocked',
        severity: 'high',
        userAgent: request.headers.get('user-agent')?.trim() || undefined,
        ...(clientIp ? { ip: clientIp } : {}),
        details: {
          route: '/api/process',
          reason: error instanceof Error ? error.message : 'Unsafe source URL',
        },
      })
      return Response.json(
        { error: error instanceof Error ? error.message : 'Unsafe source URL' },
        { status: 400 }
      )
    }

    try {
      options = await hydrateYouTubeProcessingDuration(options)
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Failed to determine YouTube video duration' },
        { status: 400 }
      )
    }

    options.estimatedCostUsd = estimateTotalCost(options)

    const jobId = await createAndDispatchJob(options)

    return Response.json({ jobId })

  } catch (error) {
    err('Failed to create processing job', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to start processing' },
      { status: 500 }
    )
  }
}

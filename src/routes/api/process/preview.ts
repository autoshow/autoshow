import type { APIEvent } from "@solidjs/start/server"
import * as v from 'valibot'
import { estimateCostBreakdown } from '~/utils/cost/cost-estimation'
import { resolveUpload } from '~/routes/api/download/upload-registry'
import { ProcessingFormDataSchema,validationErrorResponse } from '~/types'
import { err } from '~/utils/logger/logging'
import { getRateLimitClientIp,logSecurityEvent } from '~/utils/security/rate-limit'
import { enforceSafeProcessingSources,getLegacyUploadFieldError,prepareProcessingOptions } from './form-helpers'
import { hydrateYouTubeProcessingDuration } from './form-helpers/youtube-duration'

export async function POST({ request }: APIEvent) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const legacyUploadFieldError = getLegacyUploadFieldError(body as Record<string, unknown>)
      if (legacyUploadFieldError) {
        return Response.json({ error: legacyUploadFieldError }, { status: 400 })
      }
    }

    const formResult = v.safeParse(ProcessingFormDataSchema, body)
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
          route: '/api/process/preview',
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
    const breakdown = estimateCostBreakdown(options)

    return Response.json({ breakdown })
  } catch (error) {
    err('Failed to compute preview', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to compute preview' },
      { status: 500 }
    )
  }
}

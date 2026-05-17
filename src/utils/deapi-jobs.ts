import type { DeapiStatusResponse,IProgressTracker,SourceUtilsDeapiJobsPollOptions as PollOptions } from '~/types'
import { DeapiCreateResponseSchema,DeapiStatusResponseSchema,validateOrThrow } from '~/types'
import { requireEnvKey } from '~/utils/env'

const DEAPI_API_BASE = 'https://api.deapi.ai'
const DEFAULT_MAX_ATTEMPTS = 360
const DEFAULT_POLL_INTERVAL_MS = 5000

const getDeapiHeaders = (): HeadersInit => ({
  'Authorization': `Bearer ${requireEnvKey('DEAPI_API_KEY')}`
})

export const calculateDeapiPrice = async (
  endpoint: string,
  requestBody: Record<string, unknown>,
  _actionLabel: string
): Promise<number | undefined> => {
  const response = await fetch(`${DEAPI_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      ...getDeapiHeaders(),
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30_000)
  })

  if (!response.ok) {
    return undefined
  }

  const data = await response.json() as { data?: { price?: number } }
  return data.data?.price
}

export const createDeapiJob = async (
  endpoint: string,
  requestBody: Record<string, unknown> | FormData,
  actionLabel: string
): Promise<string> => {
  const isFormData = requestBody instanceof FormData
  const response = await fetch(`${DEAPI_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: isFormData
      ? getDeapiHeaders()
      : {
          ...getDeapiHeaders(),
          'Content-Type': 'application/json'
        },
    body: isFormData ? requestBody : JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30_000)
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(`Failed to create deAPI ${actionLabel}. Please try again.`)
  }

  let rawData: unknown
  try {
    rawData = JSON.parse(responseText)
  } catch {
    throw new Error(`deAPI ${actionLabel} create response is not valid JSON`)
  }

  const data = validateOrThrow(DeapiCreateResponseSchema, rawData, `Invalid deAPI ${actionLabel} create response`)

  return data.data.request_id
}

export const pollDeapiJob = async (
  requestId: string,
  actionLabel: string,
  progressTracker?: IProgressTracker,
  options: PollOptions = {}
): Promise<DeapiStatusResponse> => {
  const {
    stepNumber,
    progressStart = 20,
    progressEnd = 90,
    progressLabel = `Waiting for deAPI ${actionLabel}`,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
  } = options

  const startTime = Date.now()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${DEAPI_API_BASE}/api/v1/client/request-status/${requestId}`, {
      headers: getDeapiHeaders(),
      signal: AbortSignal.timeout(30_000)
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`Failed to check deAPI ${actionLabel} status. Please try again.`)
    }

    let rawData: unknown
    try {
      rawData = JSON.parse(responseText)
    } catch {
      throw new Error(`deAPI ${actionLabel} status response is not valid JSON`)
    }

    const data = validateOrThrow(DeapiStatusResponseSchema, rawData, `Invalid deAPI ${actionLabel} status response`)

    if (data.data.status === 'done') {
      return data
    }

    if (data.data.status === 'error') {
      const errorMessage = data.data.error || `deAPI ${actionLabel} failed`
      throw new Error(errorMessage)
    }

    if (progressTracker && stepNumber !== undefined) {
      const scaledProgress = progressStart + Math.floor((attempt / Math.max(maxAttempts - 1, 1)) * (progressEnd - progressStart))
      const progressBits = []
      if (data.data.progress != null) {
        progressBits.push(`${Math.round(data.data.progress)}% provider`)
      }
      progressBits.push(`${Math.floor((Date.now() - startTime) / 1000)}s elapsed`)
      progressTracker.updateStepProgress(stepNumber, scaledProgress, `${progressLabel} (${progressBits.join(', ')})`)
    }

    await Bun.sleep(pollIntervalMs)
  }

  throw new Error(`deAPI ${actionLabel} timed out`)
}

export const downloadDeapiResult = async (resultUrl: string, actionLabel: string): Promise<Buffer> => {
  const response = await fetch(resultUrl, {
    headers: getDeapiHeaders(),
    signal: AbortSignal.timeout(60_000)
  })

  if (!response.ok) {
    throw new Error(`Failed to download deAPI ${actionLabel} result. Please try again.`)
  }

  return Buffer.from(await response.arrayBuffer())
}

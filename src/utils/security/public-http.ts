import type {
SourceUtilsSecurityPublicHttpDownloadPublicHttpFileResult as DownloadPublicHttpFileResult,
SourceUtilsSecurityPublicHttpOpenPublicHttpResponseOptions as OpenPublicHttpResponseOptions,
SourceUtilsSecurityPublicHttpOpenPublicHttpResponseResult as OpenPublicHttpResponseResult,
SourceUtilsSecurityPublicHttpPublicHttpRequestOptions as PublicHttpRequestOptions,
SourceUtilsSecurityPublicHttpPublicHttpResponse as PublicHttpResponse
} from '~/types'
import { PublicHttpMaxBytesExceededError,enforceContentLengthLimit,streamResponseToFile } from './public-http-body'
import { requireResolvedPublicHttpUrl } from './security-config'

const drainResponse = async (response: Response): Promise<void> => {
  await response.body?.cancel()
}

const readResponseBody = async (
  response: Response,
  maxBytes: number
): Promise<Uint8Array> => {
  const body = response.body
  if (!body) return new Uint8Array()

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        throw new PublicHttpMaxBytesExceededError(maxBytes, totalBytes)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  return Buffer.concat(chunks)
}

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_REDIRECTS = 5
export { PublicHttpMaxBytesExceededError,isPublicHttpMaxBytesExceededError } from './public-http-body'

const headersToRecord = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => { result[key] = value })
  return result
}

const openPublicHttpResponse = async (
  rawUrl: string,
  options: OpenPublicHttpResponseOptions = {}
): Promise<OpenPublicHttpResponseResult> => {
  const { maxRedirects = DEFAULT_MAX_REDIRECTS, timeoutMs = DEFAULT_TIMEOUT_MS } = options
  let currentUrl = rawUrl

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const resolved = await requireResolvedPublicHttpUrl(currentUrl, 'Remote URL')

    let response: Response
    try {
      response = await fetch(resolved.url, {
        method: options.method ?? 'GET',
        ...(options.headers && { headers: options.headers }),
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs)
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`)
      }
      throw error
    }

    const status = response.status
    const headers = headersToRecord(response.headers)
    const location = headers.location

    if (status >= 300 && status < 400 && location) {
      await drainResponse(response)
      currentUrl = new URL(location, resolved.url).toString()
      continue
    }

    return { resolved, response, status, headers }
  }

  throw new Error(`Remote URL: exceeded redirect limit (${maxRedirects})`)
}

const requestPublicHttpUrl = async (
  rawUrl: string,
  options: PublicHttpRequestOptions
): Promise<PublicHttpResponse> => {
  const { resolved, response, status, headers } = await openPublicHttpResponse(rawUrl, options)
  enforceContentLengthLimit(headers, options.maxBytes)
  const body = options.method === 'HEAD'
    ? await drainResponse(response).then(() => new Uint8Array())
    : await readResponseBody(response, options.maxBytes)

  return {
    url: resolved.url,
    status,
    headers,
    body
  }
}

export const getPublicHttpUrlHeaders = async (rawUrl: string): Promise<Record<string, string>> => {
  const headResponse = await openPublicHttpResponse(rawUrl, { method: 'HEAD' })
  try {
    if (![405, 501].includes(headResponse.status)) {
      return headResponse.headers
    }
  } finally {
    await drainResponse(headResponse.response)
  }

  const rangeResponse = await openPublicHttpResponse(rawUrl, {
    method: 'GET',
    headers: { Range: 'bytes=0-0' }
  })

  await drainResponse(rangeResponse.response)
  return rangeResponse.headers
}

export const readPublicHttpUrlText = async (
  rawUrl: string,
  maxBytes: number
): Promise<string> => {
  const response = await requestPublicHttpUrl(rawUrl, { maxBytes })

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Remote URL: request failed with status ${response.status}`)
  }

  return new TextDecoder().decode(response.body)
}

export const downloadPublicHttpUrlToFile = async (
  rawUrl: string,
  outputPath: string,
  maxBytes: number
): Promise<DownloadPublicHttpFileResult> => {
  const { resolved, response, status, headers } = await openPublicHttpResponse(rawUrl)

  if (status < 200 || status >= 300) {
    await drainResponse(response)
    throw new Error(`Remote URL: request failed with status ${status}`)
  }

  enforceContentLengthLimit(headers, maxBytes)
  await streamResponseToFile(response, outputPath, maxBytes)

  return {
    url: resolved.url,
    status,
    headers
  }
}

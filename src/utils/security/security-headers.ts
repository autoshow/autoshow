import {
defineMiddleware,
eventHandler,
getContext,
getRequestURL,
getResponseHeader,
getResponseStatus,
setContext,
setHeader,
setHeaders
} from 'vinxi/http'
import { clearLogContext,err,setLogContext } from '../logger/logging'
import { buildSecurityHeaders,createCspNonce } from './security-config'
import { getSerializedResponseContentTypeOverride } from './serialized-response-content-type'

const REQUEST_ID_HEADER = 'x-request-id'
const REQUEST_START_KEY = 'autoshow:request:start'
const REQUEST_ID_KEY = 'autoshow:request:id'
const REQUEST_ROUTE_KEY = 'autoshow:request:route'
const REQUEST_METHOD_KEY = 'autoshow:request:method'
export const REQUEST_CSP_NONCE_KEY = 'autoshow:request:csp-nonce'

const applySecurityHeaders = (event: unknown, nonce?: string): void => {
  const headers = nonce
    ? buildSecurityHeaders({ nonce })
    : buildSecurityHeaders()
  setHeaders(event as any, headers as any)
}

const normalizeSerializedServerFunctionResponse = (event: unknown): void => {
  const contentTypeOverride = getSerializedResponseContentTypeOverride(
    getResponseHeader(event as any, 'x-serialized') as string | string[] | number | undefined,
    getResponseHeader(event as any, 'content-type') as string | string[] | number | undefined,
  )

  if (contentTypeOverride) {
    setHeader(event as any, 'Content-Type', contentTypeOverride)
  }
}

const createRequestId = (): string => {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

const getHeaderValue = (value: string | string[] | undefined): string | undefined => {
  if (!value) return undefined
  if (Array.isArray(value)) {
    return value[0]?.trim()
  }
  return value.trim()
}

const getRequestMethod = (event: unknown): string => {
  const requestEvent = event as { method?: string; node?: { req?: { method?: string } } }
  return requestEvent.method || requestEvent.node?.req?.method || 'GET'
}

const securityHeadersMiddleware = defineMiddleware({
  onRequest: async event => {
    const cspNonce = createCspNonce()
    setContext(event, REQUEST_CSP_NONCE_KEY, cspNonce)
    applySecurityHeaders(event, cspNonce)

    const incomingRequestId = getHeaderValue(event.node?.req?.headers?.[REQUEST_ID_HEADER])
    const requestId = incomingRequestId || createRequestId()
    const route = getRequestURL(event).pathname
    const method = getRequestMethod(event).toUpperCase()
    const startedAt = Date.now()
    setHeader(event, REQUEST_ID_HEADER, requestId)
    setContext(event, REQUEST_START_KEY, startedAt)
    setContext(event, REQUEST_ID_KEY, requestId)
    setContext(event, REQUEST_ROUTE_KEY, route)
    setContext(event, REQUEST_METHOD_KEY, method)
    setLogContext({ requestId, route, method, component: 'http' })
  },
  onBeforeResponse: async event => {
    const cspNonce = getContext(event, REQUEST_CSP_NONCE_KEY)
    applySecurityHeaders(event, typeof cspNonce === 'string' ? cspNonce : undefined)
    normalizeSerializedServerFunctionResponse(event)

    const startedAt = Number(getContext(event, REQUEST_START_KEY) || Date.now())
    const requestId = String(getContext(event, REQUEST_ID_KEY) || '')
    const route = String(getContext(event, REQUEST_ROUTE_KEY) || getRequestURL(event).pathname)
    const method = String(getContext(event, REQUEST_METHOD_KEY) || getRequestMethod(event).toUpperCase())
    const status = getResponseStatus(event)
    const durationMs = Math.max(0, Date.now() - startedAt)
    const outcome = status >= 500 ? 'server_error' : status >= 400 ? 'client_error' : 'success'
    const payload = { requestId, method, route, status, durationMs, outcome }

    if (route.startsWith('/api/') && status >= 500) {
      err('HTTP request completed', payload)
    }

    clearLogContext()
  }
})

export default eventHandler({
  onRequest: securityHeadersMiddleware.onRequest!,
  onBeforeResponse: securityHeadersMiddleware.onBeforeResponse!,
  handler: () => undefined
})

type AnthropicCompatibleProvider = 'anthropic' | 'minimax'

type AnthropicBase64Source = {
  type: 'base64'
  media_type: string
  data: string
}

export type AnthropicRequestContentBlock =
  | { type: 'text'; text: string }
  | { type: 'document'; source: AnthropicBase64Source; title?: string }
  | { type: 'image'; source: AnthropicBase64Source }

type AnthropicMessage = {
  role: 'user' | 'assistant'
  content: string | AnthropicRequestContentBlock[]
}

type AnthropicJsonSchemaOutputFormat = {
  type: 'json_schema'
  schema: Record<string, unknown>
}

type AnthropicMessagesRequestBody = {
  model: string
  max_tokens: number
  system?: string
  messages: AnthropicMessage[]
  output_config?: {
    format: AnthropicJsonSchemaOutputFormat
  }
}

type AnthropicMessagesFetchRequest = {
  url: string
  init: {
    method: 'POST'
    headers: Record<string, string>
    body: string
  }
}

type AnthropicMessagesResponseContentBlock = {
  type: string
  text?: string
  [key: string]: unknown
}

type AnthropicMessagesResponse = {
  content?: AnthropicMessagesResponseContentBlock[]
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
  base_resp?: {
    status_code?: number | string
    status_msg?: string
  }
  request_id?: string
  [key: string]: unknown
}

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const MINIMAX_ANTHROPIC_MESSAGES_URL = 'https://api.minimax.io/anthropic/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

const PROVIDER_LABELS: Record<AnthropicCompatibleProvider, string> = {
  anthropic: 'Anthropic',
  minimax: 'MiniMax'
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const normalizeAnthropicJsonSchema = (schema: unknown): unknown => {
  if (Array.isArray(schema)) {
    return schema.map(item => normalizeAnthropicJsonSchema(item))
  }

  if (!isPlainObject(schema)) {
    return schema
  }

  const normalized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(schema)) {
    normalized[key] = normalizeAnthropicJsonSchema(value)
  }

  if (normalized.type === 'object') {
    normalized.additionalProperties = false
  }

  return normalized
}

export const buildAnthropicJsonSchemaOutputFormat = (
  schema: Record<string, unknown>
): AnthropicJsonSchemaOutputFormat => {
  return {
    type: 'json_schema',
    schema: normalizeAnthropicJsonSchema(schema) as Record<string, unknown>
  }
}

const buildAnthropicMessagesRequest = (
  provider: AnthropicCompatibleProvider,
  apiKey: string,
  body: AnthropicMessagesRequestBody
): AnthropicMessagesFetchRequest => {
  const isMiniMax = provider === 'minimax'

  return {
    url: isMiniMax ? MINIMAX_ANTHROPIC_MESSAGES_URL : ANTHROPIC_MESSAGES_URL,
    init: {
      method: 'POST',
      headers: isMiniMax
        ? {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey
        }
        : {
          'Content-Type': 'application/json',
          'anthropic-version': ANTHROPIC_VERSION,
          'x-api-key': apiKey
        },
      body: JSON.stringify(body)
    }
  }
}

class AnthropicMessagesApiError extends Error {
  public readonly provider: AnthropicCompatibleProvider
  public readonly status: number | undefined
  public readonly requestId: string | undefined

  public constructor({
    provider,
    status,
    requestId,
    message
  }: {
    provider: AnthropicCompatibleProvider
    status?: number | undefined
    requestId?: string | undefined
    message: string
  }) {
    const statusText = status == null ? '' : ` HTTP ${status}`
    const requestIdText = requestId ? ` request ${requestId}` : ''
    super(`${PROVIDER_LABELS[provider]} Messages API failed${statusText}${requestIdText}: ${message}`)
    this.name = 'AnthropicMessagesApiError'
    this.provider = provider
    this.status = status
    this.requestId = requestId
  }
}

const parseResponseJson = (rawText: string): unknown => {
  if (!rawText.trim()) {
    return {}
  }

  return JSON.parse(rawText)
}

const getStringProperty = (value: unknown, key: string): string | undefined => {
  if (!isPlainObject(value)) {
    return undefined
  }

  const property = value[key]
  return typeof property === 'string' ? property : undefined
}

const getResponseRequestId = (response: Response, data: unknown): string | undefined => {
  return response.headers.get('request-id') ??
    response.headers.get('x-request-id') ??
    getStringProperty(data, 'request_id')
}

const getProviderErrorMessage = (data: unknown, fallbackText: string): string => {
  if (isPlainObject(data)) {
    const error = data.error
    const errorMessage = getStringProperty(error, 'message')
    if (errorMessage) {
      return errorMessage
    }

    const message = getStringProperty(data, 'message')
    if (message) {
      return message
    }

    const baseResp = data.base_resp
    const statusMessage = getStringProperty(baseResp, 'status_msg')
    if (statusMessage) {
      return statusMessage
    }
  }

  return fallbackText.trim() || 'Unknown provider error'
}

const getMiniMaxBaseResponseStatusCode = (data: AnthropicMessagesResponse): number | undefined => {
  const statusCode = data.base_resp?.status_code
  if (typeof statusCode === 'number') {
    return statusCode
  }

  if (typeof statusCode === 'string' && statusCode.trim()) {
    const parsed = Number(statusCode)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export const callAnthropicMessages = async (
  provider: AnthropicCompatibleProvider,
  apiKey: string,
  body: AnthropicMessagesRequestBody
): Promise<AnthropicMessagesResponse> => {
  const request = buildAnthropicMessagesRequest(provider, apiKey, body)
  const response = await fetch(request.url, request.init)
  const rawText = await response.text()
  let data: unknown

  try {
    data = parseResponseJson(rawText)
  } catch (error) {
    if (!response.ok) {
      throw new AnthropicMessagesApiError({
        provider,
        status: response.status,
        requestId: getResponseRequestId(response, undefined),
        message: rawText.trim() || (error instanceof Error ? `Invalid JSON response: ${error.message}` : 'Invalid JSON response')
      })
    }

    throw new AnthropicMessagesApiError({
      provider,
      status: response.status,
      requestId: getResponseRequestId(response, undefined),
      message: error instanceof Error ? `Invalid JSON response: ${error.message}` : 'Invalid JSON response'
    })
  }

  const requestId = getResponseRequestId(response, data)

  if (!response.ok) {
    throw new AnthropicMessagesApiError({
      provider,
      status: response.status,
      requestId,
      message: getProviderErrorMessage(data, rawText)
    })
  }

  if (!isPlainObject(data)) {
    throw new AnthropicMessagesApiError({
      provider,
      status: response.status,
      requestId,
      message: 'Provider returned a non-object JSON response'
    })
  }

  const messageResponse = data as AnthropicMessagesResponse

  if (provider === 'minimax') {
    const statusCode = getMiniMaxBaseResponseStatusCode(messageResponse)
    if (statusCode != null && statusCode !== 0) {
      const statusMessage = messageResponse.base_resp?.status_msg ?? 'MiniMax provider error'
      throw new AnthropicMessagesApiError({
        provider,
        status: response.status,
        requestId,
        message: `${statusCode} - ${statusMessage}`
      })
    }
  }

  return messageResponse
}

export const extractAnthropicTextContent = (response: AnthropicMessagesResponse): string | undefined => {
  if (!Array.isArray(response.content)) {
    return undefined
  }

  const textBlock = response.content.find(block => block.type === 'text' && typeof block.text === 'string')
  return textBlock?.text
}

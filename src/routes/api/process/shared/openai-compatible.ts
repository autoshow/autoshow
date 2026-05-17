import { basename } from 'node:path'

type OpenAICompatibleProvider = 'openai' | 'groq' | 'grok' | 'deepinfra' | 'glm'

export type ResponseInputContent = Array<{
  type: string
  text?: string
  file_id?: string
  image_url?: string
  detail?: string
}>

type OpenAICompatibleFetchRequest = {
  url: string
  init: {
    method: 'POST' | 'DELETE'
    headers: Record<string, string>
    body?: string | FormData
  }
}

type OpenAICompatibleResponsesResponse = {
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
      [key: string]: unknown
    }>
    [key: string]: unknown
  }>
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
  [key: string]: unknown
}

type OpenAICompatibleChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<string | { text?: string; [key: string]: unknown }>
      [key: string]: unknown
    }
    [key: string]: unknown
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
  [key: string]: unknown
}

type OpenAICompatibleImageResponse = {
  data?: Array<{
    b64_json?: string | null
    url?: string | null
    revised_prompt?: string | null
  }>
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
  [key: string]: unknown
}

type OpenAICompatibleFileResponse = {
  id?: string
  [key: string]: unknown
}

const PROVIDER_BASE_URLS: Record<OpenAICompatibleProvider, string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  grok: 'https://api.x.ai/v1',
  deepinfra: 'https://api.deepinfra.com/v1/openai',
  glm: 'https://api.z.ai/api/paas/v4'
}

const PROVIDER_LABELS: Record<OpenAICompatibleProvider, string> = {
  openai: 'OpenAI',
  groq: 'Groq',
  grok: 'Grok',
  deepinfra: 'DeepInfra',
  glm: 'GLM'
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const joinUrlPath = (baseUrl: string, path: string): string => {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

const jsonHeaders = (apiKey: string): Record<string, string> => ({
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json'
})

const authHeaders = (apiKey: string): Record<string, string> => ({
  'Authorization': `Bearer ${apiKey}`
})

const buildJsonRequest = (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  path: string,
  body: Record<string, unknown>
): OpenAICompatibleFetchRequest => ({
  url: joinUrlPath(PROVIDER_BASE_URLS[provider], path),
  init: {
    method: 'POST',
    headers: jsonHeaders(apiKey),
    body: JSON.stringify(body)
  }
})

const buildOpenAICompatibleResponsesRequest = (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  body: Record<string, unknown>
): OpenAICompatibleFetchRequest => {
  return buildJsonRequest(provider, apiKey, '/responses', body)
}

const buildOpenAICompatibleChatCompletionsRequest = (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  body: Record<string, unknown>
): OpenAICompatibleFetchRequest => {
  return buildJsonRequest(provider, apiKey, '/chat/completions', body)
}

const buildOpenAICompatibleAudioSpeechRequest = (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  body: Record<string, unknown>
): OpenAICompatibleFetchRequest => {
  return buildJsonRequest(provider, apiKey, '/audio/speech', body)
}

const buildOpenAICompatibleImageGenerationRequest = (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  body: Record<string, unknown>
): OpenAICompatibleFetchRequest => {
  return buildJsonRequest(provider, apiKey, '/images/generations', body)
}

const buildOpenAICompatibleFileUploadRequest = (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  filePath: string,
  purpose: string,
  fileName: string = basename(filePath)
): OpenAICompatibleFetchRequest => {
  const formData = new FormData()
  formData.append('file', Bun.file(filePath), fileName)
  formData.append('purpose', purpose)

  return {
    url: joinUrlPath(PROVIDER_BASE_URLS[provider], '/files'),
    init: {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: formData
    }
  }
}

const buildOpenAICompatibleFileDeleteRequest = (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  fileId: string
): OpenAICompatibleFetchRequest => ({
  url: joinUrlPath(PROVIDER_BASE_URLS[provider], `/files/${encodeURIComponent(fileId)}`),
  init: {
    method: 'DELETE',
    headers: authHeaders(apiKey)
  }
})

const buildOpenAICompatibleAudioTranscriptionRequest = async (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  options: {
    filePath: string
    model: string
    responseFormat: string
    timestampGranularities?: string[]
    mimeType?: string
  }
): Promise<OpenAICompatibleFetchRequest> => {
  const audioFile = Bun.file(options.filePath)
  const audioBuffer = await audioFile.arrayBuffer()
  const fileName = basename(options.filePath) || 'audio.wav'
  const file = new File([audioBuffer], fileName, { type: options.mimeType ?? 'audio/wav' })
  const formData = new FormData()
  formData.append('file', file)
  formData.append('model', options.model)
  formData.append('response_format', options.responseFormat)

  for (const granularity of options.timestampGranularities ?? []) {
    formData.append('timestamp_granularities[]', granularity)
  }

  return {
    url: joinUrlPath(PROVIDER_BASE_URLS[provider], '/audio/transcriptions'),
    init: {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: formData
    }
  }
}

class OpenAICompatibleApiError extends Error {
  public readonly provider: OpenAICompatibleProvider
  public readonly status: number | undefined
  public readonly requestId: string | undefined

  public constructor({
    provider,
    status,
    requestId,
    message
  }: {
    provider: OpenAICompatibleProvider
    status?: number | undefined
    requestId?: string | undefined
    message: string
  }) {
    const statusText = status == null ? '' : ` HTTP ${status}`
    const requestIdText = requestId ? ` request ${requestId}` : ''
    super(`${PROVIDER_LABELS[provider]} OpenAI-compatible API failed${statusText}${requestIdText}: ${message}`)
    this.name = 'OpenAICompatibleApiError'
    this.provider = provider
    this.status = status
    this.requestId = requestId
  }
}

const createOpenAICompatibleApiError = (
  args: ConstructorParameters<typeof OpenAICompatibleApiError>[0]
): OpenAICompatibleApiError => {
  return new (OpenAICompatibleApiError)(args)
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
  }

  return fallbackText.trim() || 'Unknown provider error'
}

const callOpenAICompatibleJson = async <T extends Record<string, unknown>>(
  provider: OpenAICompatibleProvider,
  request: OpenAICompatibleFetchRequest
): Promise<T> => {
  const response = await fetch(request.url, request.init)
  const rawText = await response.text()
  let data: unknown

  try {
    data = parseResponseJson(rawText)
  } catch (error) {
    throw createOpenAICompatibleApiError({
      provider,
      status: response.status,
      requestId: getResponseRequestId(response, undefined),
      message: response.ok && error instanceof Error
        ? `Invalid JSON response: ${error.message}`
        : rawText.trim() || 'Invalid JSON response'
    })
  }

  const requestId = getResponseRequestId(response, data)

  if (!response.ok) {
    throw createOpenAICompatibleApiError({
      provider,
      status: response.status,
      requestId,
      message: getProviderErrorMessage(data, rawText)
    })
  }

  if (!isPlainObject(data)) {
    throw createOpenAICompatibleApiError({
      provider,
      status: response.status,
      requestId,
      message: 'Provider returned a non-object JSON response'
    })
  }

  return data as T
}

export const callOpenAICompatibleResponses = async (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  body: Record<string, unknown>
): Promise<OpenAICompatibleResponsesResponse> => {
  return callOpenAICompatibleJson<OpenAICompatibleResponsesResponse>(
    provider,
    buildOpenAICompatibleResponsesRequest(provider, apiKey, body)
  )
}

export const callOpenAICompatibleChatCompletions = async (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  body: Record<string, unknown>
): Promise<OpenAICompatibleChatCompletionResponse> => {
  return callOpenAICompatibleJson<OpenAICompatibleChatCompletionResponse>(
    provider,
    buildOpenAICompatibleChatCompletionsRequest(provider, apiKey, body)
  )
}

export const callOpenAICompatibleImageGeneration = async (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  body: Record<string, unknown>
): Promise<OpenAICompatibleImageResponse> => {
  return callOpenAICompatibleJson<OpenAICompatibleImageResponse>(
    provider,
    buildOpenAICompatibleImageGenerationRequest(provider, apiKey, body)
  )
}

export const uploadOpenAICompatibleFile = async (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  filePath: string,
  purpose: string,
  fileName?: string
): Promise<OpenAICompatibleFileResponse> => {
  return callOpenAICompatibleJson<OpenAICompatibleFileResponse>(
    provider,
    buildOpenAICompatibleFileUploadRequest(provider, apiKey, filePath, purpose, fileName)
  )
}

export const deleteOpenAICompatibleFile = async (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  fileId: string
): Promise<void> => {
  await callOpenAICompatibleJson<Record<string, unknown>>(
    provider,
    buildOpenAICompatibleFileDeleteRequest(provider, apiKey, fileId)
  )
}

export const callOpenAICompatibleAudioSpeech = async (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  body: Record<string, unknown>
): Promise<ArrayBuffer> => {
  const request = buildOpenAICompatibleAudioSpeechRequest(provider, apiKey, body)
  const response = await fetch(request.url, request.init)

  if (!response.ok) {
    const rawText = await response.text()
    let data: unknown
    try {
      data = parseResponseJson(rawText)
    } catch {
      data = undefined
    }
    throw createOpenAICompatibleApiError({
      provider,
      status: response.status,
      requestId: getResponseRequestId(response, data),
      message: getProviderErrorMessage(data, rawText)
    })
  }

  return response.arrayBuffer()
}

export const callOpenAICompatibleAudioTranscription = async (
  provider: OpenAICompatibleProvider,
  apiKey: string,
  options: {
    filePath: string
    model: string
    responseFormat: string
    timestampGranularities?: string[]
    mimeType?: string
  }
): Promise<Record<string, unknown>> => {
  return callOpenAICompatibleJson<Record<string, unknown>>(
    provider,
    await buildOpenAICompatibleAudioTranscriptionRequest(provider, apiKey, options)
  )
}

export const extractOutputText = (response: OpenAICompatibleResponsesResponse): string | undefined => {
  if (Array.isArray(response.output)) {
    const textParts = response.output.flatMap(outputItem => {
      if (outputItem.type !== 'message' || !Array.isArray(outputItem.content)) {
        return []
      }

      return outputItem.content
        .filter(contentItem => contentItem.type === 'output_text' && typeof contentItem.text === 'string')
        .map(contentItem => contentItem.text as string)
    })

    if (textParts.length > 0) {
      return textParts.join('')
    }
  }

  return typeof response.output_text === 'string' ? response.output_text : undefined
}

export const extractCompletionText = (response: OpenAICompatibleChatCompletionResponse): string | undefined => {
  const content = response.choices?.[0]?.message?.content
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return undefined
  }

  const text = content
    .map(part => {
      if (typeof part === 'string') {
        return part
      }
      return typeof part.text === 'string' ? part.text : ''
    })
    .join('')

  return text || undefined
}

export const getResponsesUsageTokens = (
  response: OpenAICompatibleResponsesResponse
): { inputTokens?: number; outputTokens?: number } => ({
  ...(response.usage?.input_tokens != null && { inputTokens: response.usage.input_tokens }),
  ...(response.usage?.output_tokens != null && { outputTokens: response.usage.output_tokens })
})

export const getChatCompletionUsageTokens = (
  response: OpenAICompatibleChatCompletionResponse
): { inputTokens?: number; outputTokens?: number } => ({
  ...(response.usage?.prompt_tokens != null && { inputTokens: response.usage.prompt_tokens }),
  ...(response.usage?.completion_tokens != null && { outputTokens: response.usage.completion_tokens })
})

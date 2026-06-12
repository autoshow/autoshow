import { basename } from 'node:path'

export type GeminiMediaResolution = 'MEDIA_RESOLUTION_LOW' | 'MEDIA_RESOLUTION_MEDIUM' | 'MEDIA_RESOLUTION_HIGH'

type GeminiPart = {
  text?: string
  fileData?: {
    fileUri: string
    mimeType: string
  }
  inlineData?: {
    data?: string
    mimeType?: string
  }
}

export type GeminiContent = {
  role?: 'user' | 'model'
  parts: GeminiPart[]
}

type GeminiGenerateContentRequestBody = {
  contents: string | GeminiContent[]
  generationConfig?: Record<string, unknown>
  [key: string]: unknown
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[]
    }
    [key: string]: unknown
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
  [key: string]: unknown
}

type GeminiFile = {
  name?: string
  uri?: string
  mimeType?: string
  [key: string]: unknown
}

type GeminiFetchRequest = {
  url: string
  init: {
    method: 'POST' | 'PUT' | 'DELETE'
    headers: Record<string, string>
    body?: string | Blob | ArrayBuffer
  }
}

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_UPLOAD_BASE_URL = 'https://generativelanguage.googleapis.com/upload/v1beta'

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const getGeminiModelPath = (model: string): string => {
  const normalizedModel = model.startsWith('models/') ? model.slice('models/'.length) : model
  return `models/${encodeURIComponent(normalizedModel)}`
}

const normalizeGeminiContents = (contents: string | GeminiContent[]): GeminiContent[] => {
  if (typeof contents === 'string') {
    return [{ role: 'user', parts: [{ text: contents }] }]
  }

  return contents
}

export const buildGeminiStructuredJsonGenerationConfig = (
  responseJsonSchema: unknown,
  mediaResolution?: GeminiMediaResolution
): Record<string, unknown> => ({
  responseMimeType: 'application/json',
  responseJsonSchema,
  ...(mediaResolution ? { mediaResolution } : {})
})

const buildGeminiGenerateContentRequest = (
  apiKey: string,
  model: string,
  body: GeminiGenerateContentRequestBody
): GeminiFetchRequest => {
  const normalizedBody = {
    ...body,
    contents: normalizeGeminiContents(body.contents)
  }

  return {
    url: `${GEMINI_API_BASE_URL}/${getGeminiModelPath(model)}:generateContent`,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(normalizedBody)
    }
  }
}

class GeminiApiError extends Error {
  public readonly status: number | undefined
  public readonly errorCode: string | undefined

  public constructor({
    status,
    errorCode,
    message
  }: {
    status?: number | undefined
    errorCode?: string | undefined
    message: string
  }) {
    const statusText = status == null ? '' : ` HTTP ${status}`
    const errorCodeText = errorCode ? ` ${errorCode}` : ''
    super(`Gemini API failed${statusText}${errorCodeText}: ${message}`)
    this.name = 'GeminiApiError'
    this.status = status
    this.errorCode = errorCode
  }
}

const parseResponseJson = (rawText: string): unknown => {
  if (!rawText.trim()) {
    return {}
  }

  return JSON.parse(rawText)
}

const getGeminiErrorMessage = (data: unknown, fallbackText: string): string => {
  if (isPlainObject(data) && isPlainObject(data.error)) {
    const message = data.error.message
    if (typeof message === 'string') {
      return message
    }
  }

  return fallbackText.trim() || 'Unknown Gemini error'
}

const getGeminiErrorCode = (data: unknown): string | undefined => {
  if (!isPlainObject(data) || !isPlainObject(data.error)) {
    return undefined
  }

  const status = data.error.status
  if (typeof status === 'string') {
    return status
  }

  const code = data.error.code
  return typeof code === 'number' ? String(code) : undefined
}

const callGeminiJson = async <T extends Record<string, unknown>>(request: GeminiFetchRequest): Promise<T> => {
  const response = await fetch(request.url, request.init)
  const rawText = await response.text()
  let data: unknown

  try {
    data = parseResponseJson(rawText)
  } catch (error) {
    throw new GeminiApiError({
      status: response.status,
      message: response.ok && error instanceof Error
        ? `Invalid JSON response: ${error.message}`
        : rawText.trim() || 'Invalid JSON response'
    })
  }

  if (!response.ok) {
    throw new GeminiApiError({
      status: response.status,
      errorCode: getGeminiErrorCode(data),
      message: getGeminiErrorMessage(data, rawText)
    })
  }

  if (!isPlainObject(data)) {
    throw new GeminiApiError({
      status: response.status,
      message: 'Provider returned a non-object JSON response'
    })
  }

  return data as T
}

export const callGeminiGenerateContent = async (
  apiKey: string,
  model: string,
  body: GeminiGenerateContentRequestBody
): Promise<GeminiGenerateContentResponse> => {
  return callGeminiJson<GeminiGenerateContentResponse>(
    buildGeminiGenerateContentRequest(apiKey, model, body)
  )
}

export const uploadGeminiFile = async (
  apiKey: string,
  path: string,
  mimeType: string,
  displayName: string = basename(path)
): Promise<GeminiFile> => {
  const file = Bun.file(path)
  const startResponse = await fetch(`${GEMINI_UPLOAD_BASE_URL}/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(file.size),
      'X-Goog-Upload-Header-Content-Type': mimeType
    },
    body: JSON.stringify({ file: { displayName } })
  })

  if (!startResponse.ok) {
    const rawText = await startResponse.text()
    let data: unknown
    try {
      data = parseResponseJson(rawText)
    } catch {
      data = undefined
    }
    throw new GeminiApiError({
      status: startResponse.status,
      errorCode: getGeminiErrorCode(data),
      message: getGeminiErrorMessage(data, rawText)
    })
  }

  const uploadUrl = startResponse.headers.get('x-goog-upload-url')
  if (!uploadUrl) {
    throw new GeminiApiError({
      status: startResponse.status,
      message: 'Gemini file upload did not return an upload URL'
    })
  }

  const uploadRequest: GeminiFetchRequest = {
    url: uploadUrl,
    init: {
      method: 'PUT',
      headers: {
        'Content-Length': String(file.size),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize'
      },
      body: file
    }
  }

  const uploaded = await callGeminiJson<{ file?: GeminiFile }>(uploadRequest)
  if (!uploaded.file) {
    throw new GeminiApiError({
      status: 200,
      message: 'Gemini file upload did not return file metadata'
    })
  }

  return uploaded.file
}

export const deleteGeminiFile = async (apiKey: string, fileName: string): Promise<void> => {
  const encodedName = fileName.split('/').map(segment => encodeURIComponent(segment)).join('/')
  const request: GeminiFetchRequest = {
    url: `${GEMINI_API_BASE_URL}/${encodedName}`,
    init: {
      method: 'DELETE',
      headers: {
        'x-goog-api-key': apiKey
      }
    }
  }

  await callGeminiJson<Record<string, unknown>>(request)
}

export const downloadGeminiUri = async (
  apiKey: string,
  uri: string,
  outputPath: string
): Promise<void> => {
  const url = new URL(uri)
  url.searchParams.set('key', apiKey)
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey
    }
  })

  if (!response.ok) {
    const rawText = await response.text()
    throw new GeminiApiError({
      status: response.status,
      message: rawText.trim() || `Gemini file download failed: ${response.status}`
    })
  }

  await Bun.write(outputPath, Buffer.from(await response.arrayBuffer()))
}

export const extractGeminiText = (response: GeminiGenerateContentResponse): string | undefined => {
  const parts = response.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) {
    return undefined
  }

  const text = parts
    .map(part => typeof part.text === 'string' ? part.text : '')
    .join('')

  return text || undefined
}

export const extractGeminiInlineData = (
  response: GeminiGenerateContentResponse,
  mimeTypePrefix: string
): { data: string; mimeType?: string } | undefined => {
  const parts = response.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) {
    return undefined
  }

  for (const part of parts) {
    const inlineData = part.inlineData
    if (!inlineData?.data) {
      continue
    }

    if (!inlineData.mimeType?.startsWith(mimeTypePrefix)) {
      continue
    }

    return {
      data: inlineData.data,
      ...(inlineData.mimeType ? { mimeType: inlineData.mimeType } : {})
    }
  }

  return undefined
}

export const getGeminiUsageTokens = (
  response: GeminiGenerateContentResponse
): { inputTokens?: number; outputTokens?: number; totalTokens?: number } => ({
  ...(response.usageMetadata?.promptTokenCount != null && { inputTokens: response.usageMetadata.promptTokenCount }),
  ...(response.usageMetadata?.candidatesTokenCount != null && { outputTokens: response.usageMetadata.candidatesTokenCount }),
  ...(response.usageMetadata?.totalTokenCount != null && { totalTokens: response.usageMetadata.totalTokenCount })
})

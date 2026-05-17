import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename } from 'node:path'
import * as v from 'valibot'
import { getDocumentFlatRateUsd } from '~/utils/cost/cost-estimation'
import { executeCommand } from '~/routes/api/process/01-dl-audio/dl-utils'
import type {
DeapiCreateResponse,SourceRoutesApiProcess02RunTranscribeDocumentServicesDeapiRunDeapiDocumentDeapiDocumentStatusResponse as DeapiDocumentStatusResponse,DeapiOCRExtractionResult,
DeapiOCRModel,
DeapiResult,
IProgressTracker,
Step2DocumentMetadata
} from '~/types'
import {
DeapiCreateResponseSchema,
DeapiDocumentStatusResponseSchema,
validateOrThrow
} from '~/types'

const DEAPI_API_BASE = 'https://api.deapi.ai'
const DEAPI_API_KEY = process.env['DEAPI_API_KEY']
const DEAPI_IMAGE_MAX_DIMENSION = 768

const createTempFilePath = (fileName: string): string => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const normalized = fileName.replace(/[^a-z0-9._-]/gi, '-').replace(/-+/g, '-')
  return `${tmpdir()}/deapi-document-${stamp}-${normalized}`
}

const parseJsonResponse = <T,>(
  responseText: string,
  schema: v.GenericSchema<unknown, T>,
  context: string
): T => {
  let rawData: unknown
  try {
    rawData = JSON.parse(responseText)
  } catch {
    throw new Error(`${context}: response is not valid JSON`)
  }

  return validateOrThrow(schema, rawData, context)
}

const downloadRemoteDocument = async (documentUrl: string): Promise<{ path: string, fileName: string }> => {
  const url = new URL(documentUrl)
  const fileName = basename(url.pathname) || 'document-image'
  const tempPath = createTempFilePath(fileName)
  const response = await fetch(documentUrl)

  if (!response.ok) {
    throw new Error(`Failed to download document: ${response.status} ${response.statusText}`)
  }

  await Bun.write(tempPath, await response.arrayBuffer())
  return { path: tempPath, fileName }
}

const getImageDimensions = async (filePath: string): Promise<{ width: number, height: number } | null> => {
  const result = await executeCommand('magick', ['identify', '-format', '%w %h', filePath])
  if (result.exitCode !== 0) {
    return null
  }

  const [widthString, heightString] = result.stdout.trim().split(/\s+/)
  const width = Number(widthString)
  const height = Number(heightString)

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }

  return { width, height }
}

const normalizeImageForDeapi = async (
  filePath: string,
  fileName: string
): Promise<{ path: string, fileName: string, cleanupPath?: string }> => {
  const dimensions = await getImageDimensions(filePath)
  if (!dimensions) {
    return { path: filePath, fileName }
  }

  const largestDimension = Math.max(dimensions.width, dimensions.height)
  if (largestDimension <= DEAPI_IMAGE_MAX_DIMENSION) {
    return { path: filePath, fileName }
  }

  const resizedPath = createTempFilePath(fileName)
  const resizeResult = await executeCommand('magick', [
    filePath,
    '-strip',
    '-resize',
    `${DEAPI_IMAGE_MAX_DIMENSION}x${DEAPI_IMAGE_MAX_DIMENSION}>`,
    resizedPath
  ])

  if (resizeResult.exitCode !== 0) {
    throw new Error(`Failed to resize image for deAPI OCR: ${resizeResult.stderr || resizeResult.stdout}`)
  }

  return {
    path: resizedPath,
    fileName: basename(resizedPath),
    cleanupPath: resizedPath
  }
}

const createDeapiDocumentRequest = async (
  filePath: string,
  fileName: string,
  model: DeapiOCRModel
): Promise<string> => {
  if (!DEAPI_API_KEY) {
    throw new Error('DEAPI_API_KEY environment variable is required')
  }

  const formData = new FormData()
  formData.append('image', Bun.file(filePath), fileName)
  formData.append('model', model)
  formData.append('format', 'text')
  formData.append('return_result_in_response', 'true')

  const response = await fetch(`${DEAPI_API_BASE}/api/v1/client/img2txt`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEAPI_API_KEY}`
    },
    body: formData
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(`Failed to create deAPI document extraction: ${response.statusText} - ${responseText}`)
  }

  const data = parseJsonResponse<DeapiCreateResponse>(
    responseText,
    DeapiCreateResponseSchema,
    'Invalid deAPI create response'
  )

  return data.data.request_id
}

const pollDeapiDocumentRequest = async (
  requestId: string,
  progressTracker?: IProgressTracker
): Promise<DeapiDocumentStatusResponse> => {
  if (!DEAPI_API_KEY) {
    throw new Error('DEAPI_API_KEY environment variable is required')
  }

  const maxAttempts = 600
  const pollInterval = 5000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${DEAPI_API_BASE}/api/v1/client/request-status/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${DEAPI_API_KEY}`
      }
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`Failed to check deAPI document status: ${response.statusText} - ${responseText}`)
    }

    const data = parseJsonResponse<DeapiDocumentStatusResponse>(
      responseText,
      DeapiDocumentStatusResponseSchema,
      'Invalid deAPI status response'
    )

    if (data.data.status === 'done') {
      return data
    }

    if (data.data.status === 'error') {
      const errorMessage = data.data.error || 'Unknown error'
      throw new Error(`deAPI document extraction failed: ${errorMessage}`)
    }

    if (attempt % 6 === 0 && attempt > 0) {
      const elapsedSeconds = Math.floor((attempt * pollInterval) / 1000)
      const progress = Math.min(65, 20 + (attempt / maxAttempts) * 45)
      progressTracker?.updateStepProgress(2, progress, `Extracting with deAPI OCR... (${elapsedSeconds}s elapsed)`)
    }

    await Bun.sleep(pollInterval)
  }

  throw new Error('deAPI document extraction timed out after 50 minutes')
}

const extractDocumentTextFromDeapiResult = async (response: DeapiDocumentStatusResponse): Promise<string> => {
  const inlineResult = response.data.result

  if (typeof inlineResult === 'string') {
    const text = inlineResult.trim()
    if (text.length > 0) {
      return text
    }
  }

  if (inlineResult && typeof inlineResult === 'object') {
    const typedResult = inlineResult as DeapiResult
    const text = typedResult.text.trim()
    if (text.length > 0) {
      return text
    }
  }

  const resultUrl = response.data.result_url
  if (resultUrl) {
    const resultResponse = await fetch(resultUrl, {
      headers: {
        'Authorization': `Bearer ${DEAPI_API_KEY}`
      }
    })

    const resultText = await resultResponse.text()
    if (!resultResponse.ok) {
      throw new Error(`Failed to fetch deAPI OCR result: ${resultResponse.statusText} - ${resultText}`)
    }

    const trimmed = resultText.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }

  throw new Error('deAPI document extraction did not return any text')
}

export const runDeapiDocument = async (
  documentPath: string | null,
  documentUrl: string | null,
  model: DeapiOCRModel,
  progressTracker?: IProgressTracker
): Promise<DeapiOCRExtractionResult> => {
  if (!DEAPI_API_KEY) {
    progressTracker?.error(2, 'Configuration error', 'DEAPI_API_KEY environment variable is required')
    throw new Error('DEAPI_API_KEY environment variable is required')
  }

  if (!documentPath && !documentUrl) {
    throw new Error('Either documentPath or documentUrl must be provided')
  }

  const startTime = Date.now()
  let workingPath = documentPath
  const cleanupPaths: string[] = []
  let fileName = workingPath ? basename(workingPath) : 'document-image'

  try {
    progressTracker?.updateStepProgress(2, 10, 'Preparing document for deAPI OCR')

    if (!workingPath) {
      const downloaded = await downloadRemoteDocument(documentUrl!)
      workingPath = downloaded.path
      cleanupPaths.push(downloaded.path)
      fileName = downloaded.fileName
    }

    const normalized = await normalizeImageForDeapi(workingPath, fileName)
    workingPath = normalized.path
    fileName = normalized.fileName
    if (normalized.cleanupPath) {
      cleanupPaths.push(normalized.cleanupPath)
    }

    progressTracker?.updateStepProgress(2, 20, 'Submitting document to deAPI OCR')
    const requestId = await createDeapiDocumentRequest(workingPath, fileName, model)

    progressTracker?.updateStepProgress(2, 25, 'Waiting for deAPI OCR to complete')
    const response = await pollDeapiDocumentRequest(requestId, progressTracker)

    progressTracker?.updateStepProgress(2, 90, 'Processing extraction results')

    const markdown = await extractDocumentTextFromDeapiResult(response)

    const metadata: Step2DocumentMetadata = {
      extractionService: 'deapi',
      extractionModel: model,
      processingTime: Date.now() - startTime,
      pageCount: 1,
      characterCount: markdown.length,
      totalCost: getDocumentFlatRateUsd('deapi', model, 1),
      actualCostUsd: getDocumentFlatRateUsd('deapi', model, 1)
    }

    progressTracker?.completeStep(2, 'Document extraction complete')

    return {
      markdown,
      pageCount: 1,
      metadata
    }
  } finally {
    await Promise.all(cleanupPaths.map(async cleanupPath => {
      await rm(cleanupPath, { force: true }).catch(() => undefined)
    }))
  }
}

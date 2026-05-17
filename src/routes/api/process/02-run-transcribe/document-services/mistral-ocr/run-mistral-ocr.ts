import { getDocumentFlatRateUsd } from '~/utils/cost/cost-estimation'
import type { IProgressTracker,SourceRoutesApiProcess02RunTranscribeDocumentServicesMistralOcrRunMistralOcrMistralApiError as MistralApiError,MistralOCRExtractionResult,MistralOCRModel,MistralOCRResponse,Step2DocumentMetadata } from '~/types'

const MISTRAL_API_KEY = process.env['MISTRAL_API_KEY']
const MISTRAL_API_BASE = 'https://api.mistral.ai/v1'
const MISTRAL_OCR_ENDPOINT = `${MISTRAL_API_BASE}/ocr`
const MISTRAL_FILES_ENDPOINT = `${MISTRAL_API_BASE}/files`
const MISTRAL_OCR_MAX_ATTEMPTS = 3
const MISTRAL_OCR_RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])

const createMistralApiError = (message: string, status?: number): MistralApiError => {
  const error = new Error(message) as MistralApiError
  if (status !== undefined) {
    error.status = status
  }
  return error
}

const isRetryableMistralError = (error: unknown): error is MistralApiError => {
  if (!(error instanceof Error)) {
    return false
  }

  const maybeApiError = error as MistralApiError
  return maybeApiError.status === undefined || MISTRAL_OCR_RETRYABLE_STATUSES.has(maybeApiError.status)
}

const submitLocalDocument = async (
  documentPath: string
): Promise<string> => {
  if (!MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY environment variable is required')
  }

  const file = Bun.file(documentPath)
  const fileName = documentPath.split('/').pop() || 'document'
  const fileBuffer = await file.arrayBuffer()

  const formData = new FormData()
  formData.append('file', new Blob([fileBuffer]), fileName)
  formData.append('purpose', 'ocr')

  const response = await fetch(MISTRAL_FILES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`
    },
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Mistral file upload failed: ${response.status} ${errorText}`)
  }

  const result = await response.json() as { id: string }
  return result.id
}

const getSignedUrl = async (fileId: string): Promise<string> => {
  if (!MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY environment variable is required')
  }

  const response = await fetch(`${MISTRAL_FILES_ENDPOINT}/${fileId}/url?expiry=1`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get signed URL: ${response.status} ${errorText}`)
  }

  const result = await response.json() as { url: string }
  return result.url
}

const deleteFile = async (fileId: string): Promise<void> => {
  if (!MISTRAL_API_KEY) {
    return
  }

  try {
    await fetch(`${MISTRAL_FILES_ENDPOINT}/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      }
    })
  } catch (error) {
  }
}

const isImageFile = (pathOrUrl: string): boolean => {
  const lower = pathOrUrl.toLowerCase()
  return lower.endsWith('.png') || lower.endsWith('.jpg') || 
         lower.endsWith('.jpeg') || lower.endsWith('.gif') ||
         lower.endsWith('.webp') || lower.endsWith('.avif')
}

const callOCREndpoint = async (
  documentInput: { type: 'document_url' | 'image_url' | 'file_id'; url?: string; fileId?: string },
  model: MistralOCRModel,
  progressTracker?: IProgressTracker
): Promise<MistralOCRResponse> => {
  if (!MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY environment variable is required')
  }

  progressTracker?.updateStepProgress(2, 50, 'Calling Mistral OCR API')

  let document: Record<string, unknown>
  if (documentInput.type === 'file_id') {
    document = {
      type: 'file',
      file_id: documentInput.fileId
    }
  } else if (documentInput.type === 'image_url') {
    document = {
      type: 'image_url',
      image_url: documentInput.url
    }
  } else {
    document = {
      type: 'document_url',
      document_url: documentInput.url
    }
  }

  const requestBody = {
    model,
    document,
    include_image_base64: false
  }

  for (let attempt = 1; attempt <= MISTRAL_OCR_MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      progressTracker?.updateStepProgress(2, 50, `Retrying Mistral OCR API (${attempt}/${MISTRAL_OCR_MAX_ATTEMPTS})`)
    }

    try {
      const response = await fetch(MISTRAL_OCR_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw createMistralApiError(`Mistral OCR request failed: ${response.status} ${errorText}`, response.status)
      }

      const result = await response.json() as MistralOCRResponse
      return result
    } catch (error) {
      if (!isRetryableMistralError(error) || attempt === MISTRAL_OCR_MAX_ATTEMPTS) {
        throw error
      }

      const retryDelayMs = attempt * 1000
      await Bun.sleep(retryDelayMs)
    }
  }

  throw createMistralApiError('Mistral OCR request failed without a response')
}

const extractMarkdown = (response: MistralOCRResponse): { markdown: string; pageCount: number } => {
  const pages = response.pages || []
  const markdown = pages.map(page => page.markdown).join('\n\n---\n\n')
  const pageCount = pages.length

  return { markdown, pageCount }
}

export const runMistralOCR = async (
  documentPath: string | null,
  documentUrl: string | null,
  model: MistralOCRModel,
  progressTracker?: IProgressTracker
): Promise<MistralOCRExtractionResult> => {
  if (!MISTRAL_API_KEY) {
    progressTracker?.error(2, 'Configuration error', 'MISTRAL_API_KEY environment variable is required')
    throw new Error('MISTRAL_API_KEY environment variable is required')
  }

  if (!documentPath && !documentUrl) {
    throw new Error('Either documentPath or documentUrl must be provided')
  }

  const startTime = Date.now()
  let uploadedFileId: string | null = null

  try {
    progressTracker?.updateStepProgress(2, 10, 'Submitting document to Mistral OCR')

    let ocrResponse: MistralOCRResponse

    if (documentPath) {
      progressTracker?.updateStepProgress(2, 20, 'Uploading document to Mistral')
      
      uploadedFileId = await submitLocalDocument(documentPath)
      
      const signedUrl = await getSignedUrl(uploadedFileId)
      
      const isImage = isImageFile(documentPath)
      ocrResponse = await callOCREndpoint(
        { type: isImage ? 'image_url' : 'document_url', url: signedUrl },
        model,
        progressTracker
      )
    } else {
      progressTracker?.updateStepProgress(2, 20, 'Submitting document URL to Mistral OCR')
      
      const isImage = isImageFile(documentUrl!)
      ocrResponse = await callOCREndpoint(
        { type: isImage ? 'image_url' : 'document_url', url: documentUrl! },
        model,
        progressTracker
      )
    }

    progressTracker?.updateStepProgress(2, 90, 'Processing extraction results')

    const { markdown, pageCount } = extractMarkdown(ocrResponse)

    const processingTime = Date.now() - startTime

    progressTracker?.completeStep(2, 'Document extraction complete')

    const metadata: Step2DocumentMetadata = {
      extractionService: 'mistral-ocr',
      extractionModel: model,
      processingTime,
      pageCount,
      characterCount: markdown.length,
      totalCost: getDocumentFlatRateUsd('mistral-ocr', model, pageCount),
      actualCostUsd: getDocumentFlatRateUsd('mistral-ocr', model, pageCount)
    }

    return {
      markdown,
      pageCount,
      metadata
    }
  } finally {
    if (uploadedFileId) {
      await deleteFile(uploadedFileId)
    }
  }
}

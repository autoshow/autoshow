import { l, err } from '~/utils/logging'
import type { MistralOCRModel, MistralOCRResponse, IProgressTracker, MistralOCRExtractionResult, Step2DocumentMetadata } from '~/types'

const MISTRAL_API_KEY = process.env['MISTRAL_API_KEY']
const MISTRAL_API_BASE = 'https://api.mistral.ai/v1'
const MISTRAL_OCR_ENDPOINT = `${MISTRAL_API_BASE}/ocr`
const MISTRAL_FILES_ENDPOINT = `${MISTRAL_API_BASE}/files`

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

  l('Uploading local document to Mistral Files API', { fileName })

  const response = await fetch(MISTRAL_FILES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`
    },
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    err('Mistral file upload failed', { status: response.status, error: errorText })
    throw new Error(`Mistral file upload failed: ${response.status} ${errorText}`)
  }

  const result = await response.json() as { id: string }
  l('File uploaded to Mistral', { fileId: result.id })
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
    err('Failed to get signed URL', { status: response.status, error: errorText })
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
    l('Deleted temporary file from Mistral', { fileId })
  } catch (error) {
    err('Failed to delete temporary file', { fileId, error })
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

  l('Calling Mistral OCR endpoint', { 
    documentType: documentInput.type,
    model 
  })

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
    err('Mistral OCR request failed', { status: response.status, error: errorText })
    throw new Error(`Mistral OCR request failed: ${response.status} ${errorText}`)
  }

  const result = await response.json() as MistralOCRResponse
  return result
}

const extractMarkdown = (response: MistralOCRResponse): { markdown: string; pageCount: number } => {
  const pages = response.pages || []
  const markdown = pages.map(page => page.markdown).join('\n\n---\n\n')
  const pageCount = pages.length

  l('Extracted markdown from Mistral OCR', { 
    pageCount, 
    characterCount: markdown.length,
    model: response.model
  })

  return { markdown, pageCount }
}

export const runMistralOCR = async (
  documentPath: string | null,
  documentUrl: string | null,
  model: MistralOCRModel,
  progressTracker?: IProgressTracker
): Promise<MistralOCRExtractionResult> => {
  if (!MISTRAL_API_KEY) {
    err('MISTRAL_API_KEY not found in environment')
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
      characterCount: markdown.length
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

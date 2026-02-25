import { l, err } from '~/utils/logging'
import type { LlamaParseModel, LlamaParseResult, IProgressTracker, LlamaParseExtractionResult, Step2DocumentMetadata } from '~/types'

const LLAMAPARSE_API_KEY = process.env['LLAMAPARSE_API_KEY']
const LLAMAPARSE_API_BASE = 'https://api.cloud.llamaindex.ai/api/v2/parse'
const POLL_INTERVAL_MS = 5000
const MAX_POLL_TIME_MS = 30 * 60 * 1000

const submitLocalDocument = async (
  documentPath: string,
  model: LlamaParseModel
): Promise<string> => {
  if (!LLAMAPARSE_API_KEY) {
    throw new Error('LLAMAPARSE_API_KEY environment variable is required')
  }

  const file = Bun.file(documentPath)
  const fileName = documentPath.split('/').pop() || 'document'
  const fileBuffer = await file.arrayBuffer()

  const formData = new FormData()
  formData.append('file', new Blob([fileBuffer]), fileName)
  formData.append('configuration', JSON.stringify({
    tier: model,
    version: 'latest',
    output_options: {
      markdown: {
        annotate_links: true,
        tables: {
          compact_markdown_tables: true
        }
      }
    }
  }))

  l('Submitting local document to LlamaParse', { fileName, model })

  const response = await fetch(`${LLAMAPARSE_API_BASE}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
      'Accept': 'application/json'
    },
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    err('LlamaParse upload failed', { status: response.status, error: errorText })
    throw new Error(`LlamaParse upload failed: ${response.status} ${errorText}`)
  }

  const result = await response.json() as { id: string }
  return result.id
}

const submitDocumentUrl = async (
  documentUrl: string,
  model: LlamaParseModel
): Promise<string> => {
  if (!LLAMAPARSE_API_KEY) {
    throw new Error('LLAMAPARSE_API_KEY environment variable is required')
  }

  l('Submitting document URL to LlamaParse', { url: documentUrl, model })

  const response = await fetch(LLAMAPARSE_API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source_url: documentUrl,
      tier: model,
      version: 'latest',
      output_options: {
        markdown: {
          annotate_links: true,
          tables: {
            compact_markdown_tables: true
          }
        }
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    err('LlamaParse URL submission failed', { status: response.status, error: errorText })
    throw new Error(`LlamaParse URL submission failed: ${response.status} ${errorText}`)
  }

  const result = await response.json() as { id: string }
  return result.id
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

const pollForCompletion = async (
  jobId: string,
  model: LlamaParseModel,
  progressTracker?: IProgressTracker
): Promise<LlamaParseResult> => {
  if (!LLAMAPARSE_API_KEY) {
    throw new Error('LLAMAPARSE_API_KEY environment variable is required')
  }

  const startTime = Date.now()
  let lastStatus = ''
  const isFastTier = model === 'fast'
  const expandParam = isFastTier ? 'text' : 'markdown'
  const pollUrl = `${LLAMAPARSE_API_BASE}/${jobId}?expand=${expandParam}`

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    const response = await fetch(pollUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : POLL_INTERVAL_MS * 2
        l('Rate limited, waiting', { waitTime })
        await sleep(waitTime)
        continue
      }
      const errorText = await response.text()
      err('LlamaParse status check failed', { status: response.status, error: errorText })
      throw new Error(`LlamaParse status check failed: ${response.status} ${errorText}`)
    }

    const rawResult = await response.json() as Record<string, unknown>
    const jobData = rawResult.job as Record<string, unknown> | undefined
    
    const status = (jobData?.status as string) || (rawResult.status as string) || ''
    const statusUpper = status.toUpperCase()

    if (statusUpper !== lastStatus) {
      l('LlamaParse job status', { jobId, status: statusUpper })
      lastStatus = statusUpper

      if (progressTracker) {
        const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000)
        const statusMessage = `LlamaParse: ${statusUpper}${elapsedMinutes > 0 ? ` (${elapsedMinutes}m)` : ''}`
        progressTracker.updateStepProgress(2, 50, statusMessage)
      }
    }

    if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED') {
      if (isFastTier) {
        const textData = rawResult.text as { pages?: Array<{ text: string; page_number?: number }> } | undefined
        const pages = textData?.pages || []
        const text = pages.map(page => page.text).join('\n\n---\n\n')
        l('Extracted text from fast tier', { pageCount: pages.length, characterCount: text.length })
        return {
          id: jobId,
          status: 'SUCCESS',
          result: {
            markdown: {
              pages: [{ markdown: text }]
            }
          }
        } as LlamaParseResult
      }
      
      return rawResult as unknown as LlamaParseResult
    }

    if (statusUpper === 'FAILED' || statusUpper === 'ERROR') {
      const errorMsg = (jobData?.error_message as string) || (rawResult.error_message as string)
      err('LlamaParse job failed', { jobId, error: errorMsg })
      throw new Error(`LlamaParse extraction failed: ${errorMsg || 'Unknown error'}`)
    }

    if (statusUpper === 'CANCELLED') {
      throw new Error('LlamaParse job was cancelled')
    }

    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error(`LlamaParse extraction timed out after ${MAX_POLL_TIME_MS / 60000} minutes`)
}

const extractMarkdown = (result: LlamaParseResult): { markdown: string; pageCount: number } => {
  const rawResult = result as unknown as Record<string, unknown>
  const markdownData = rawResult.markdown as { pages?: Array<{ markdown: string; page_number?: number }> } | undefined
  const pages = markdownData?.pages || result.result?.markdown?.pages || []
  const markdown = pages.map(page => page.markdown).join('\n\n---\n\n')
  const pageCount = pages.length

  l('Extracted markdown from LlamaParse', { pageCount, characterCount: markdown.length })

  return { markdown, pageCount }
}

export const runLlamaParse = async (
  documentPath: string | null,
  documentUrl: string | null,
  model: LlamaParseModel,
  progressTracker?: IProgressTracker
): Promise<LlamaParseExtractionResult> => {
  if (!LLAMAPARSE_API_KEY) {
    err('LLAMAPARSE_API_KEY not found in environment')
    progressTracker?.error(2, 'Configuration error', 'LLAMAPARSE_API_KEY environment variable is required')
    throw new Error('LLAMAPARSE_API_KEY environment variable is required')
  }

  if (!documentPath && !documentUrl) {
    throw new Error('Either documentPath or documentUrl must be provided')
  }

  const startTime = Date.now()

  try {
    progressTracker?.updateStepProgress(2, 10, 'Submitting document to LlamaParse')

    let jobId: string
    if (documentPath) {
      progressTracker?.updateStepProgress(2, 20, 'Uploading document to LlamaParse')
      jobId = await submitLocalDocument(documentPath, model)
    } else {
      progressTracker?.updateStepProgress(2, 20, 'Submitting document URL to LlamaParse')
      jobId = await submitDocumentUrl(documentUrl!, model)
    }

    progressTracker?.updateStepProgress(2, 50, 'Waiting for LlamaParse extraction')

    const result = await pollForCompletion(jobId, model, progressTracker)

    progressTracker?.updateStepProgress(2, 90, 'Processing extraction results')

    const { markdown, pageCount } = extractMarkdown(result)

    const processingTime = Date.now() - startTime

    progressTracker?.completeStep(2, 'Document extraction complete')

    const metadata: Step2DocumentMetadata = {
      extractionService: 'llamaparse',
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
  }
}

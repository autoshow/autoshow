import { getDocumentFlatRateUsd } from '~/utils/cost/cost-estimation'
import type { GlmOCRExtractionResult,GlmOCRModel,SourceRoutesApiProcess02RunTranscribeDocumentServicesGlmRunGlmOcrGlmOCRResponse as GlmOCRResponse,IProgressTracker,Step2DocumentMetadata } from '~/types'

const GLM_API_KEY = process.env['GLM_API_KEY']
const GLM_OCR_ENDPOINT = 'https://api.z.ai/api/paas/v4/layout_parsing'

export const runGlmOCR = async (
  documentPath: string | null,
  documentUrl: string | null,
  model: GlmOCRModel,
  progressTracker?: IProgressTracker
): Promise<GlmOCRExtractionResult> => {
  if (!GLM_API_KEY) {
    progressTracker?.error(2, 'Configuration error', 'GLM_API_KEY environment variable is required')
    throw new Error('GLM_API_KEY environment variable is required')
  }

  if (!documentPath && !documentUrl) {
    throw new Error('Either documentPath or documentUrl must be provided')
  }

  const startTime = Date.now()

  progressTracker?.updateStepProgress(2, 10, 'Submitting document to GLM OCR')

  let file: string

  if (documentPath) {
    progressTracker?.updateStepProgress(2, 20, 'Reading document for GLM OCR')
    const fileData = Bun.file(documentPath)
    const fileBuffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(fileBuffer).toString('base64')
    file = `data:application/octet-stream;base64,${base64}`
  } else {
    progressTracker?.updateStepProgress(2, 20, 'Submitting document URL to GLM OCR')
    file = documentUrl!
  }

  progressTracker?.updateStepProgress(2, 50, 'Calling GLM OCR API')

  const response = await fetch(GLM_OCR_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GLM_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ model, file })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GLM OCR request failed: ${response.status} ${errorText}`)
  }

  const result = await response.json() as GlmOCRResponse

  progressTracker?.updateStepProgress(2, 90, 'Processing extraction results')

  const markdown = result.md_results
  const pageCount = result.data_info.num_pages

  const processingTime = Date.now() - startTime

  progressTracker?.completeStep(2, 'Document extraction complete')

  const metadata: Step2DocumentMetadata = {
    extractionService: 'glm',
    extractionModel: model,
    processingTime,
    pageCount,
    characterCount: markdown.length,
    totalCost: getDocumentFlatRateUsd('glm', model, pageCount),
    actualCostUsd: getDocumentFlatRateUsd('glm', model, pageCount)
  }

  return { markdown, pageCount, metadata }
}

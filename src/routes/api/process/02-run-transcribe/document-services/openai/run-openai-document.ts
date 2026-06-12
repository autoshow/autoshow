import type { DocumentExtractionResult,IProgressTracker,OpenAIDocumentModel,SourceRoutesApiProcess02RunTranscribeDocumentServicesPreprocessDocumentPreprocessedDocumentDescriptor as PreprocessedDocumentDescriptor } from '~/types'
import {
type ResponseInputContent,
callOpenAICompatibleResponses,
deleteOpenAICompatibleFile,
extractOutputText,
uploadOpenAICompatibleFile
} from '~/routes/api/process/shared/openai-compatible'
import {
DOCUMENT_EXTRACTION_JSON_SCHEMA,
buildDocumentExtractionPrompt,
buildDocumentExtractionResult,
buildDocumentMetadata,
logDocumentCompletion,
parseDocumentExtractionResponse,
requireEnvKey,
runDocumentRequestWithRetries
} from '../document-helpers'

const createImageDataUrl = async (path: string, mimeType: string): Promise<string> => {
  const file = Bun.file(path)
  const buffer = await file.arrayBuffer()
  return `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`
}

export const runOpenAIDocument = async (
  preprocessed: PreprocessedDocumentDescriptor,
  model: OpenAIDocumentModel,
  progressTracker?: IProgressTracker
): Promise<DocumentExtractionResult> => {
  const apiKey = requireEnvKey('OPENAI_API_KEY')
  const startTime = Date.now()

  progressTracker?.updateStepProgress(2, 30, `Calling OpenAI ${model}...`)

  const result = await runDocumentRequestWithRetries('OpenAI', progressTracker, async () => {
    let uploadedFileId: string | null = null

    try {
      const content: ResponseInputContent = [
        {
          type: 'input_text',
          text: buildDocumentExtractionPrompt(preprocessed.effectiveType)
        }
      ]

      if (preprocessed.inputMode === 'text') {
        content.push({
          type: 'input_text',
          text: preprocessed.text ?? ''
        })
      } else if (preprocessed.effectiveType === 'pdf' || preprocessed.effectiveType === 'docx') {
        const fileObject = await uploadOpenAICompatibleFile('openai', apiKey, preprocessed.path!, 'user_data', preprocessed.fileName)
        if (!fileObject.id) {
          throw new Error('OpenAI file upload did not return an id')
        }
        uploadedFileId = fileObject.id

        content.push({
          type: 'input_file',
          file_id: uploadedFileId
        })
      } else {
        content.push({
          type: 'input_image',
          image_url: await createImageDataUrl(preprocessed.path!, preprocessed.mimeType),
          detail: 'high'
        })
      }

      const response = await callOpenAICompatibleResponses('openai', apiKey, {
        model,
        input: [
          {
            role: 'user',
            content
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'document_extraction',
            strict: true,
            schema: DOCUMENT_EXTRACTION_JSON_SCHEMA
          }
        }
      })

      const responseText = extractOutputText(response)
      if (!responseText) {
        throw new Error('No content in OpenAI document extraction response')
      }

      const parsed = parseDocumentExtractionResponse(responseText)
      const metadata = buildDocumentMetadata(
        'openai',
        model,
        startTime,
        preprocessed.pageCount,
        parsed.markdown,
        response.usage?.input_tokens,
        response.usage?.output_tokens,
        preprocessed.originalType !== preprocessed.effectiveType ? preprocessed.originalType : undefined
      )

      logDocumentCompletion('OpenAI', metadata, progressTracker)
      progressTracker?.completeStep(2, 'Document extraction complete')
      return buildDocumentExtractionResult(metadata, parsed.markdown)
    } finally {
      if (uploadedFileId) {
        await deleteOpenAICompatibleFile('openai', apiKey, uploadedFileId).catch(() => undefined)
      }
    }
  })

  return result
}

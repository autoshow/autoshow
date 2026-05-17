import type { ClaudeDocumentModel,DocumentExtractionResult,IProgressTracker,SourceRoutesApiProcess02RunTranscribeDocumentServicesPreprocessDocumentPreprocessedDocumentDescriptor as PreprocessedDocumentDescriptor } from '~/types'
import { buildAnthropicJsonSchemaOutputFormat,callAnthropicMessages,extractAnthropicTextContent,type AnthropicRequestContentBlock } from '~/routes/api/process/shared/anthropic-messages'
import {
DOCUMENT_EXTRACTION_JSON_SCHEMA,
buildDocumentExtractionPrompt,
buildDocumentExtractionResult,
buildDocumentMetadata,
logDocumentCompletion,
requireEnvKey,
runDocumentRequestWithRetries
} from '../document-helpers'

const createBase64Data = async (path: string): Promise<string> => {
  const file = Bun.file(path)
  const buffer = await file.arrayBuffer()
  return Buffer.from(buffer).toString('base64')
}

const parseClaudeDocumentOutput = (parsedOutput: unknown): { markdown: string } => {
  if (
    typeof parsedOutput !== 'object' ||
    parsedOutput === null ||
    Array.isArray(parsedOutput) ||
    typeof (parsedOutput as { markdown?: unknown }).markdown !== 'string'
  ) {
    throw new Error('Claude document extraction response did not include a markdown string')
  }

  return {
    markdown: (parsedOutput as { markdown: string }).markdown.trim()
  }
}

export const runClaudeDocument = async (
  preprocessed: PreprocessedDocumentDescriptor,
  model: ClaudeDocumentModel,
  progressTracker?: IProgressTracker
): Promise<DocumentExtractionResult> => {
  const apiKey = requireEnvKey('ANTHROPIC_API_KEY')
  const startTime = Date.now()

  progressTracker?.updateStepProgress(2, 30, `Calling Claude ${model}...`)

  return runDocumentRequestWithRetries('Claude', progressTracker, async () => {
    const content: AnthropicRequestContentBlock[] = [
      {
        type: 'text',
        text: buildDocumentExtractionPrompt(preprocessed.effectiveType)
      }
    ]

    if (preprocessed.inputMode === 'text') {
      content.push({
        type: 'text',
        text: preprocessed.text ?? ''
      })
    } else if (preprocessed.effectiveType === 'pdf') {
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: await createBase64Data(preprocessed.path!)
        },
        title: preprocessed.fileName
      })
    } else if (preprocessed.effectiveType === 'png' || preprocessed.effectiveType === 'jpg') {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: preprocessed.mimeType as 'image/png' | 'image/jpeg',
          data: await createBase64Data(preprocessed.path!)
        }
      })
    } else {
      throw new Error(`Claude does not support ${preprocessed.effectiveType.toUpperCase()} document extraction`)
    }

    const response = await callAnthropicMessages('anthropic', apiKey, {
      model,
      max_tokens: 16384,
      system: 'You extract documents into structured JSON. Return only the requested JSON object.',
      messages: [{ role: 'user', content }],
      output_config: {
        format: buildAnthropicJsonSchemaOutputFormat(DOCUMENT_EXTRACTION_JSON_SCHEMA)
      }
    })

    const responseText = extractAnthropicTextContent(response)
    const parsed = parseClaudeDocumentOutput(responseText ? JSON.parse(responseText) : undefined)
    const metadata = buildDocumentMetadata(
      'claude',
      model,
      startTime,
      preprocessed.pageCount,
      parsed.markdown,
      response.usage?.input_tokens,
      response.usage?.output_tokens,
      preprocessed.originalType !== preprocessed.effectiveType ? preprocessed.originalType : undefined
    )

    logDocumentCompletion('Claude', metadata, progressTracker)
    progressTracker?.completeStep(2, 'Document extraction complete')
    return buildDocumentExtractionResult(metadata, parsed.markdown)
  })
}

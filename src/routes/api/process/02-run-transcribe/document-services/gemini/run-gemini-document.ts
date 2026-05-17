import type { DocumentExtractionResult,GeminiDocumentModel,IProgressTracker,SourceRoutesApiProcess02RunTranscribeDocumentServicesPreprocessDocumentPreprocessedDocumentDescriptor as PreprocessedDocumentDescriptor } from '~/types'
import {
type GeminiContent,
type GeminiMediaResolution,
buildGeminiStructuredJsonGenerationConfig,
callGeminiGenerateContent,
deleteGeminiFile,
extractGeminiText,
uploadGeminiFile
} from '~/routes/api/process/shared/gemini-rest'
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

const getGeminiResolution = (effectiveType: PreprocessedDocumentDescriptor['effectiveType']): GeminiMediaResolution => {
  return effectiveType === 'pdf'
    ? 'MEDIA_RESOLUTION_MEDIUM'
    : 'MEDIA_RESOLUTION_HIGH'
}

export const runGeminiDocument = async (
  preprocessed: PreprocessedDocumentDescriptor,
  model: GeminiDocumentModel,
  progressTracker?: IProgressTracker
): Promise<DocumentExtractionResult> => {
  const apiKey = requireEnvKey('GEMINI_API_KEY')
  const startTime = Date.now()

  progressTracker?.updateStepProgress(2, 30, `Calling Gemini ${model}...`)

  return runDocumentRequestWithRetries('Gemini', progressTracker, async () => {
    let uploadedFileName: string | undefined
    let mediaResolution: GeminiMediaResolution | undefined

    try {
      const contents: Promise<GeminiContent[]> | GeminiContent[] = preprocessed.inputMode === 'text'
        ? [{
          role: 'user',
          parts: [
            { text: buildDocumentExtractionPrompt(preprocessed.effectiveType) },
            { text: preprocessed.text ?? '' }
          ]
        }]
        : (async () => {
          mediaResolution = getGeminiResolution(preprocessed.effectiveType)
          const file = await uploadGeminiFile(apiKey, preprocessed.path!, preprocessed.mimeType, preprocessed.fileName)
          uploadedFileName = file.name
          if (!file.uri) {
            throw new Error('Gemini file upload did not return a URI')
          }

          return [{
            role: 'user',
            parts: [
              { text: buildDocumentExtractionPrompt(preprocessed.effectiveType) },
              {
                fileData: { fileUri: file.uri, mimeType: file.mimeType ?? preprocessed.mimeType }
              }
            ]
          }]
        })()

      const response = await callGeminiGenerateContent(apiKey, model, {
        contents: await contents,
        generationConfig: buildGeminiStructuredJsonGenerationConfig(
          DOCUMENT_EXTRACTION_JSON_SCHEMA,
          mediaResolution
        )
      })

      const responseText = extractGeminiText(response)
      if (!responseText) {
        throw new Error('No text content in Gemini document extraction response')
      }

      const parsed = parseDocumentExtractionResponse(responseText)
      const metadata = buildDocumentMetadata(
        'gemini',
        model,
        startTime,
        preprocessed.pageCount,
        parsed.markdown,
        response.usageMetadata?.promptTokenCount,
        response.usageMetadata?.candidatesTokenCount,
        preprocessed.originalType !== preprocessed.effectiveType ? preprocessed.originalType : undefined
      )

      logDocumentCompletion('Gemini', metadata, progressTracker)
      progressTracker?.completeStep(2, 'Document extraction complete')
      return buildDocumentExtractionResult(metadata, parsed.markdown)
    } finally {
      if (uploadedFileName) {
        await deleteGeminiFile(apiKey, uploadedFileName).catch(() => undefined)
      }
    }
  })
}

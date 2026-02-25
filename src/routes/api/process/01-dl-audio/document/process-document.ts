import { l, err } from '~/utils/logging'
import type { ProcessingOptions, VideoMetadata, IProgressTracker, TranscriptionResult, LlamaParseModel, MistralOCRModel } from '~/types'
import { extractDocumentMetadata } from '~/routes/api/process/01-dl-audio/document/metadata-document'
import { backupDocumentToRailway } from '~/routes/api/process/01-dl-audio/backup-document'
import { runLlamaParse } from '~/routes/api/process/02-run-transcribe/document-services/llamaparse/run-llamaparse'
import { runMistralOCR } from '~/routes/api/process/02-run-transcribe/document-services/mistral-ocr/run-mistral-ocr'
import { createOutputDirectory, runPostTranscriptionPipeline } from '../processing-helpers'
import { getDocumentType } from '../dl-utils'

export const processDocument = async (
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  jobId: string
): Promise<string> => {
  progressTracker.startStep(1, 'Processing document')

  l('Processing document', {
    localFile: options.localFilePath ? true : false,
    documentUrl: options.documentUrl ? true : false,
    documentType: options.documentType,
    documentModel: options.documentModel
  })

  const documentPath = options.localFilePath || null
  const documentUrl = options.documentUrl || null
  const documentFileName = options.localFileName || (documentUrl ? documentUrl.split('/').pop() || 'document' : 'document')

  if (!documentPath && !documentUrl) {
    err('No document path or URL provided')
    progressTracker.error(1, 'Missing document', 'No document path or URL provided')
    throw new Error('No document path or URL provided')
  }

  if (!options.documentModel) {
    err('No document model specified')
    progressTracker.error(1, 'Missing configuration', 'Document extraction model not specified')
    throw new Error('Document extraction model not specified')
  }

  progressTracker.updateStepProgress(1, 25, 'Extracting document metadata')

  let documentMetadata
  if (documentPath) {
    documentMetadata = await extractDocumentMetadata(documentPath, documentFileName)
  } else {
    const docType = options.documentType || getDocumentType(documentFileName) || 'pdf'
    documentMetadata = {
      title: documentFileName.replace(/\.[^/.]+$/, ''),
      fileSize: options.urlFileSize || 0,
      source: 'url' as const,
      documentType: docType
    }
  }

  progressTracker.updateStepProgress(1, 50, 'Creating output directory')

  const { showNoteId, outputDir } = await createOutputDirectory()

  const processingOptions: ProcessingOptions = {
    ...options,
    outputDir
  }

  progressTracker.updateStepProgress(1, 75, 'Backing up document')

  const backupResult = await backupDocumentToRailway(documentPath, documentUrl, jobId, documentFileName)

  const step1DocumentMetadata = {
    documentUrl: documentUrl || `file://${documentPath}`,
    documentTitle: documentMetadata.title,
    documentType: documentMetadata.documentType,
    documentFileSize: documentMetadata.fileSize,
    pageCount: documentMetadata.pageCount
  }

  progressTracker.completeStep(1, 'Document processed')

  progressTracker.startStep(2, 'Extracting text from document')

  const documentService = options.documentService || 'llamaparse'

  let extractionResult

  if (documentService === 'mistral-ocr') {
    extractionResult = await runMistralOCR(
      documentPath,
      documentUrl,
      options.documentModel as MistralOCRModel,
      progressTracker
    )
  } else {
    extractionResult = await runLlamaParse(
      documentPath,
      documentUrl,
      options.documentModel as LlamaParseModel,
      progressTracker
    )
  }

  const markdownPath = `${outputDir}/extracted-content.md`
  await Bun.write(markdownPath, extractionResult.markdown)
  l('Saved extracted markdown', { path: markdownPath, characters: extractionResult.markdown.length })

  const transcriptionResult: TranscriptionResult = {
    text: extractionResult.markdown,
    segments: [{
      start: '00:00',
      end: '00:00',
      text: extractionResult.markdown
    }]
  }

  const transcriptionPath = `${outputDir}/transcription.txt`
  await Bun.write(transcriptionPath, extractionResult.markdown)

  const docTypeUpper = documentMetadata.documentType ? documentMetadata.documentType.toUpperCase() : 'PDF'
  const videoMetadata: VideoMetadata = {
    title: documentMetadata.title,
    duration: `${extractionResult.pageCount} pages`,
    author: 'Document',
    description: `Extracted from ${docTypeUpper} document`,
    url: documentUrl || `file://${documentPath}`,
    publishDate: undefined,
    thumbnail: undefined,
    channelUrl: undefined
  }

  return runPostTranscriptionPipeline({
    showNoteId,
    jobId,
    metadata: videoMetadata,
    step1Metadata: step1DocumentMetadata,
    transcriptionResult: { result: transcriptionResult, metadata: extractionResult.metadata },
    processingOptions,
    progressTracker,
    backupMetadata: backupResult
  })
}

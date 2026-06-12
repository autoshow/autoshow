import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { getDefaultDocumentService,getServerDocumentRuntimeCapabilities } from '~/models'
import { extractDocumentMetadata } from '~/routes/api/process/01-dl-audio/document/metadata-document'
import { runClaudeDocument } from '~/routes/api/process/02-run-transcribe/document-services/claude/run-claude-document'
import { runDeapiDocument } from '~/routes/api/process/02-run-transcribe/document-services/deapi/run-deapi-document'
import { runGeminiDocument } from '~/routes/api/process/02-run-transcribe/document-services/gemini/run-gemini-document'
import { runGlmOCR } from '~/routes/api/process/02-run-transcribe/document-services/glm/run-glm-ocr'
import { runGrokDocument } from '~/routes/api/process/02-run-transcribe/document-services/grok/run-grok-document'
import { runMistralOCR } from '~/routes/api/process/02-run-transcribe/document-services/mistral-ocr/run-mistral-ocr'
import { runOpenAIDocument } from '~/routes/api/process/02-run-transcribe/document-services/openai/run-openai-document'
import { preprocessDocumentInput } from '~/routes/api/process/02-run-transcribe/document-services/preprocess-document'
import type {
ClaudeDocumentModel,
CompletedPipelineResult,
DeapiOCRModel,
DocumentBackupMetadata,
GeminiDocumentModel,
GlmOCRModel,
GrokDocumentModel,
IProgressTracker,
MistralOCRModel,
OpenAIDocumentModel,
ProcessingOptions,
TranscriptionResult,
VideoMetadata
} from '~/types'
import { createS3Client } from '~/utils/s3-utils'
import { downloadPublicHttpUrlToFile,isPublicHttpMaxBytesExceededError } from '~/utils/security/public-http'
import { getDocumentType } from '../dl-utils'
import { createOutputDirectory,runPostTranscriptionPipeline } from '../processing-helpers'
import { MAX_REMOTE_DOCUMENT_BYTES } from '../remote-source-limits'

const BUCKET = process.env['BUCKET']
const ACCESS_KEY_ID = process.env['ACCESS_KEY_ID']
const SECRET_ACCESS_KEY = process.env['SECRET_ACCESS_KEY']
const ENDPOINT = process.env['ENDPOINT']

const CONTENT_TYPE_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  webp: 'image/webp'
}

const isS3Configured = (): boolean => {
  return !!(ACCESS_KEY_ID && SECRET_ACCESS_KEY && ENDPOINT && BUCKET)
}

const buildS3Url = (objectKey: string): string => {
  return `https://${BUCKET}.${new URL(ENDPOINT!).host}/${objectKey}`
}

const getContentType = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || ''
  return CONTENT_TYPE_MAP[ext] || 'application/octet-stream'
}

const backupDocumentToRailway = async (
  documentPath: string | null,
  documentUrl: string | null,
  jobId: string,
  originalFileName: string
): Promise<DocumentBackupMetadata | null> => {
  if (!isS3Configured()) {
    return null
  }

  try {
    const client = createS3Client()
    if (!client) return null

    const objectKey = `document-backups/${jobId}/${originalFileName}`
    const contentType = getContentType(originalFileName)

    let fileContent: ArrayBuffer

    if (documentPath) {
      const file = Bun.file(documentPath)
      fileContent = await file.arrayBuffer()
    } else if (documentUrl) {
      const downloadPath = `${tmpdir()}/autoshow-document-backup-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

      try {
        await downloadPublicHttpUrlToFile(documentUrl, downloadPath, MAX_REMOTE_DOCUMENT_BYTES)
        const file = Bun.file(downloadPath)
        fileContent = await file.arrayBuffer()
      } finally {
        await rm(downloadPath, { force: true })
      }
    } else {
      throw new Error('Either documentPath or documentUrl must be provided')
    }

    const s3File = client.file(objectKey)
    await s3File.write(new Uint8Array(fileContent), {
      type: contentType
    })

    const bucketUrl = buildS3Url(objectKey)

    return {
      bucketUrl,
      objectKey,
      uploadedAt: Date.now()
    }
  } catch (error) {
    if (isPublicHttpMaxBytesExceededError(error)) {
      throw error
    }

    return null
  }
}

export const processDocument = async (
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  jobId: string
): Promise<CompletedPipelineResult> => {
  progressTracker.startStep(1, 'Processing document')

  const documentPath = options.localFilePath || null
  const documentUrl = options.documentUrl || null
  const documentFileName = options.localFileName || (documentUrl ? documentUrl.split('/').pop() || 'document' : 'document')

  if (!documentPath && !documentUrl) {
    progressTracker.error(1, 'Missing document', 'No document path or URL provided')
    throw new Error('No document path or URL provided')
  }

  if (!options.documentModel) {
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

  const documentService = options.documentService || getDefaultDocumentService(
    documentMetadata.documentType,
    getServerDocumentRuntimeCapabilities()
  )

  let extractionResult

  if (documentService === 'glm') {
    extractionResult = await runGlmOCR(
      documentPath,
      documentUrl,
      options.documentModel as GlmOCRModel,
      progressTracker
    )
  } else if (documentService === 'deapi') {
    extractionResult = await runDeapiDocument(
      documentPath,
      documentUrl,
      options.documentModel as DeapiOCRModel,
      progressTracker
    )
  } else if (documentService === 'mistral-ocr') {
    extractionResult = await runMistralOCR(
      documentPath,
      documentUrl,
      options.documentModel as MistralOCRModel,
      progressTracker
    )
  } else {
    const preprocessed = await preprocessDocumentInput({
      documentPath,
      documentUrl,
      documentType: documentMetadata.documentType,
      documentService,
      outputDir
    })

    try {
      if (documentService === 'openai') {
        extractionResult = await runOpenAIDocument(
          preprocessed,
          options.documentModel as OpenAIDocumentModel,
          progressTracker
        )
      } else if (documentService === 'claude') {
        extractionResult = await runClaudeDocument(
          preprocessed,
          options.documentModel as ClaudeDocumentModel,
          progressTracker
        )
      } else if (documentService === 'grok') {
        extractionResult = await runGrokDocument(
          preprocessed,
          options.documentModel as GrokDocumentModel,
          progressTracker
        )
      } else {
        extractionResult = await runGeminiDocument(
          preprocessed,
          options.documentModel as GeminiDocumentModel,
          progressTracker
        )
      }
    } finally {
      await preprocessed.cleanup()
    }
  }

  step1DocumentMetadata.pageCount = step1DocumentMetadata.pageCount ?? extractionResult.pageCount

  const markdownPath = `${outputDir}/extracted-content.md`
  await Bun.write(markdownPath, extractionResult.markdown)

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

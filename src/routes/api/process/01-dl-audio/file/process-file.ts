import { convertFileToAudio,createFileMetadata,extractLocalFileMetadata } from '~/routes/api/process/01-dl-audio/file/dl-file'
import { transcribe } from '~/routes/api/process/02-run-transcribe/run-transcribe'
import type { CompletedPipelineResult,IProgressTracker,ProcessingOptions,Step1Metadata } from '~/types'
import { createOutputDirectory,runPostTranscriptionPipeline } from '../processing-helpers'
import { getMaxAudioInputBytes } from '../remote-source-limits'

export const processFile = async (
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  jobId: string
): Promise<CompletedPipelineResult> => {
  progressTracker.startStep(1, 'Processing local file')

  if (!options.localFilePath || !options.localFileName) {
    progressTracker.error(1, 'Missing file information', 'Local file path and name are required for file processing')
    throw new Error('Local file path and name are required for file processing')
  }

  progressTracker.updateStepProgress(1, 25, 'Extracting file metadata')

  const metadata = await extractLocalFileMetadata(options.localFilePath, options.localFileName)

  progressTracker.updateStepProgress(1, 50, 'Creating output directory')

  const { showNoteId, outputDir } = await createOutputDirectory()

  const processingOptions: ProcessingOptions = {
    ...options,
    outputDir
  }

  progressTracker.updateStepProgress(1, 75, 'Converting audio format')

  const result = await processLocalFileAudio(processingOptions)
  const audioPath = result.audioPath
  const step1Metadata = result.metadata

  progressTracker.completeStep(1, 'Audio processing complete')

  progressTracker.startStep(2, 'Starting transcription')

  const transcriptionResult = await transcribe(audioPath, processingOptions, progressTracker)

  return runPostTranscriptionPipeline({
    showNoteId,
    jobId,
    metadata,
    step1Metadata,
    transcriptionResult,
    processingOptions,
    progressTracker
  })
}

const processLocalFileAudio = async (options: ProcessingOptions): Promise<{ audioPath: string, metadata: Step1Metadata }> => {
  if (!options.localFilePath || !options.localFileName) {
    throw new Error('Local file path and name are required')
  }

  const file = Bun.file(options.localFilePath)
  const fileSize = file.size
  const maxUploadSize = getMaxAudioInputBytes()

  if (fileSize < 1000) {
    throw new Error(`File is too small (${fileSize} bytes), likely corrupted or empty`)
  }

  if (fileSize > maxUploadSize) {
    throw new Error(`File exceeds maximum upload size of ${(maxUploadSize / 1024 / 1024).toFixed(1)} MB (got ${(fileSize / 1024 / 1024).toFixed(1)} MB)`)
  }

  const showNoteId = options.outputDir.split('/').pop() || 'unknown'
  const result = await convertFileToAudio(options.localFilePath, options.outputDir, showNoteId)
  const audioPath = result.wavPath

  const videoMetadata = await extractLocalFileMetadata(options.localFilePath, options.localFileName)

  const metadata = createFileMetadata(options.localFilePath, audioPath, videoMetadata)

  return { audioPath, metadata }
}

import type { ProcessingOptions, IProgressTracker } from '~/types'
import { convertDirectUrlToAudio } from '~/routes/api/process/01-dl-audio/direct-url/dl-direct-url'
import { extractMetadataForDirectUrl, createDirectUrlMetadata } from '~/routes/api/process/01-dl-audio/direct-url/metadata-direct-url'
import { transcribe } from '~/routes/api/process/02-run-transcribe/run-transcribe'
import { createOutputDirectory, runPostTranscriptionPipeline } from '../processing-helpers'

export const processDirectUrl = async (options: ProcessingOptions, progressTracker: IProgressTracker, jobId: string): Promise<string> => {
  progressTracker.startStep(1, 'Extracting video metadata')

  const metadata = extractMetadataForDirectUrl(options.url, options.urlDuration)

  progressTracker.updateStepProgress(1, 50, 'Creating output directory')

  const { showNoteId, outputDir } = await createOutputDirectory()

  progressTracker.completeStep(1, 'Metadata extracted successfully')

  const processingOptions: ProcessingOptions = {
    ...options,
    outputDir
  }

  progressTracker.updateStepProgress(1, 75, 'Converting audio format')

  const conversionResult = await convertDirectUrlToAudio(options.url, outputDir, showNoteId)

  const step1Metadata = createDirectUrlMetadata(
    options.url,
    conversionResult.wavPath,
    conversionResult.duration || options.urlDuration
  )

  progressTracker.startStep(2, 'Starting transcription')

  const transcriptionResult = await transcribe(conversionResult.wavPath, processingOptions, progressTracker)

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

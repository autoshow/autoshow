import { l, err } from '~/utils/logging'
import type { ProcessingOptions, Step1Metadata, IProgressTracker } from '~/types'
import { extractVideoMetadata } from '~/routes/api/process/01-dl-audio/video/dl-video'
import { transcribeWithHappyScribe } from '~/routes/api/process/02-run-transcribe/transcription-services/happyscribe/run-happyscribe'
import { transcribeStreamingWithGladia } from '~/routes/api/process/02-run-transcribe/transcription-services/gladia/run-gladia-streaming'
import { createOutputDirectory, runPostTranscriptionPipeline } from '../processing-helpers'

export const processVideo = async (options: ProcessingOptions, progressTracker: IProgressTracker, jobId: string): Promise<string> => {
  progressTracker.startStep(1, 'Extracting video metadata')

  l('Starting video processing', {
    url: options.url,
    urlType: options.urlType,
    selectedPrompts: options.selectedPrompts,
    transcriptionService: options.transcriptionService,
    llmModel: options.llmModel,
    ttsEnabled: options.ttsEnabled,
    imageGenEnabled: options.imageGenEnabled,
    videoGenEnabled: options.videoGenEnabled
  })

  const metadata = await extractVideoMetadata(options.url)

  progressTracker.updateStepProgress(1, 50, 'Creating output directory')

  const { showNoteId, outputDir } = await createOutputDirectory()

  progressTracker.completeStep(1, 'Metadata extracted successfully')

  const processingOptions: ProcessingOptions = {
    ...options,
    outputDir
  }

  let step1Metadata: Step1Metadata
  let transcriptionResult

  if (options.transcriptionService === 'happyscribe') {
    progressTracker.startStep(2, 'Starting HappyScribe transcription')

    transcriptionResult = await transcribeWithHappyScribe(options.url, metadata, processingOptions, progressTracker, options.transcriptionModel)

    step1Metadata = {
      videoUrl: options.url,
      videoTitle: metadata.title,
      videoPublishDate: metadata.publishDate,
      videoThumbnail: metadata.thumbnail,
      channelTitle: metadata.author,
      channelUrl: metadata.channelUrl,
      duration: metadata.duration,
      audioFileName: 'processed-by-happyscribe',
      audioFileSize: 0
    }
  } else if (options.transcriptionService === 'gladia') {
    progressTracker.startStep(2, 'Starting Gladia transcription')

    transcriptionResult = await transcribeStreamingWithGladia(options.url, metadata, processingOptions, progressTracker, options.transcriptionModel)

    step1Metadata = {
      videoUrl: options.url,
      videoTitle: metadata.title,
      videoPublishDate: metadata.publishDate,
      videoThumbnail: metadata.thumbnail,
      channelTitle: metadata.author,
      channelUrl: metadata.channelUrl,
      duration: metadata.duration,
      audioFileName: 'processed-by-gladia',
      audioFileSize: 0
    }
  } else {
    err(`Invalid transcription service for video URL: ${options.transcriptionService}`)
    progressTracker.error(2, 'Invalid transcription service', 'Please use HappyScribe or Gladia for streaming URLs')
    throw new Error('Invalid transcription service for video URL. Please use HappyScribe or Gladia for streaming URLs.')
  }

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

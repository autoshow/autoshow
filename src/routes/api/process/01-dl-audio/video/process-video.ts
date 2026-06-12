import { extractVideoMetadata } from '~/routes/api/process/01-dl-audio/video/dl-video'
import type { CompletedPipelineResult,IProgressTracker,ProcessingOptions,Step1Metadata } from '~/types'
import { createOutputDirectory,runPostTranscriptionPipeline } from '../processing-helpers'
import { runStreamingTranscriptionWithFallback } from './streaming-transcription-fallback'

const getProcessedAudioFileName = (service: string): string => {
  return `processed-by-${service === 'youtube' ? 'youtube-captions' : service}`
}

export const processVideo = async (
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  jobId: string
): Promise<CompletedPipelineResult> => {
  progressTracker.startStep(1, 'Extracting video metadata')

  const metadata = await extractVideoMetadata(options.url)

  progressTracker.updateStepProgress(1, 50, 'Creating output directory')

  const { showNoteId, outputDir } = await createOutputDirectory()

  progressTracker.completeStep(1, 'Metadata extracted successfully')

  const processingOptions: ProcessingOptions = {
    ...options,
    outputDir
  }

  const transcriptionResult = await runStreamingTranscriptionWithFallback(
    options.url,
    metadata,
    processingOptions,
    progressTracker
  )

  const step1Metadata: Step1Metadata = {
    videoUrl: options.url,
    videoTitle: metadata.title,
    videoPublishDate: metadata.publishDate,
    videoThumbnail: metadata.thumbnail,
    channelTitle: metadata.author,
    channelUrl: metadata.channelUrl,
    duration: metadata.duration,
    audioFileName: getProcessedAudioFileName(transcriptionResult.metadata.transcriptionService),
    audioFileSize: 0
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

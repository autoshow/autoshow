import type {
SourceRoutesApiProcess04RunMediaIndexEnabledMediaKey as EnabledMediaKey,IProgressTracker,
ProcessingOptions,
RunMediaMetadata,
TranscriptionResult,
VideoMetadata
} from '~/types'
import { JOB_PROGRESS_STEP_NUMBERS } from '~/utils/job-progress'
import { buildSequentialProgressRanges,createRangedProgressTracker } from '../shared/ranged-progress-tracker'
import { processImageGeneration } from './run-image/run-image'
import { processMusicGeneration } from './run-music/run-music'
import { processVideoGeneration } from './run-video/run-video'

const getEnabledMedia = (options: ProcessingOptions): EnabledMediaKey[] => {
  const enabled: EnabledMediaKey[] = []

  if (options.imageGenEnabled && options.selectedImagePrompts?.length) {
    enabled.push('image')
  }
  if (options.videoGenEnabled && options.selectedVideoPrompts?.length) {
    enabled.push('video')
  }
  if (options.musicGenEnabled && options.selectedMusicGenre) {
    enabled.push('music')
  }

  return enabled
}

export const runMediaStage = async (
  metadata: VideoMetadata,
  transcriptionResult: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  jobId?: string
): Promise<RunMediaMetadata | undefined> => {
  const enabledMedia = getEnabledMedia(options)

  if (enabledMedia.length === 0) {
    progressTracker.skipStep(JOB_PROGRESS_STEP_NUMBERS.media)
    return {
      imageEnabled: options.imageGenEnabled ?? false,
      videoEnabled: options.videoGenEnabled ?? false,
      musicEnabled: options.musicGenEnabled ?? false,
    }
  }

  const metadataOut: RunMediaMetadata = {
    imageEnabled: options.imageGenEnabled ?? false,
    videoEnabled: options.videoGenEnabled ?? false,
    musicEnabled: options.musicGenEnabled ?? false,
  }

  const ranges = buildSequentialProgressRanges(JOB_PROGRESS_STEP_NUMBERS.media, enabledMedia.length)

  progressTracker.startStep(JOB_PROGRESS_STEP_NUMBERS.media, 'Running media stage...')

  for (const [index, mediaKey] of enabledMedia.entries()) {
    const subTracker = createRangedProgressTracker(progressTracker, ranges[index]!)

    if (mediaKey === 'image') {
      progressTracker.updateStepProgress(JOB_PROGRESS_STEP_NUMBERS.media, ranges[index]!.start, 'Running image generation...')
      const imageMetadata = await processImageGeneration(metadata, options, subTracker, jobId)
      if (imageMetadata) {
        metadataOut.image = imageMetadata
      }
      continue
    }

    if (mediaKey === 'video') {
      progressTracker.updateStepProgress(JOB_PROGRESS_STEP_NUMBERS.media, ranges[index]!.start, 'Running video generation...')
      const videoMetadata = await processVideoGeneration(
        metadata,
        transcriptionResult,
        options,
        subTracker,
        jobId
      )
      if (videoMetadata) {
        metadataOut.video = videoMetadata
      }
      continue
    }

    progressTracker.updateStepProgress(JOB_PROGRESS_STEP_NUMBERS.media, ranges[index]!.start, 'Running music generation...')
    const musicMetadata = await processMusicGeneration(
      metadata,
      transcriptionResult,
      options,
      subTracker,
      jobId
    )
    if (musicMetadata) {
      metadataOut.music = musicMetadata
    }
  }

  progressTracker.completeStep(JOB_PROGRESS_STEP_NUMBERS.media, 'Image, video, and music complete')

  return metadataOut
}

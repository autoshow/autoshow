import type { ProcessingOptions } from '~/types'
import { resolveYouTubeVideoInfo } from '../01-dl-audio/video/youtube-video-info'

const YOUTUBE_DURATION_ERROR = 'Could not determine YouTube video duration'

export const hydrateYouTubeProcessingDuration = async (
  options: ProcessingOptions
): Promise<ProcessingOptions> => {
  if (options.urlType !== 'youtube') {
    return options
  }

  const videoInfo = await resolveYouTubeVideoInfo(options.url)
  if (!videoInfo?.durationSeconds) {
    throw new Error(YOUTUBE_DURATION_ERROR)
  }

  if (options.urlDuration === videoInfo.durationSeconds) {
    return options
  }

  return {
    ...options,
    urlDuration: videoInfo.durationSeconds
  }
}

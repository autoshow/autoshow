import { extractTitleFromUrl } from '~/utils/audio'
import type { Step1Metadata, VideoMetadata } from '~/types'
import { formatDuration, getAudioFileInfo } from '../dl-utils'

export const extractMetadataForDirectUrl = (url: string, urlDuration?: number): VideoMetadata => {
  return {
    title: extractTitleFromUrl(url),
    duration: urlDuration ? formatDuration(urlDuration) : 'unknown',
    author: 'Direct URL',
    description: `Processed from direct URL: ${url}`,
    url,
    publishDate: undefined,
    thumbnail: undefined,
    channelUrl: undefined
  }
}

export const createDirectUrlMetadata = (
  url: string,
  audioPath: string,
  urlDuration?: number
): Step1Metadata => {
  const { fileName: audioFileName, fileSize: audioFileSize } = getAudioFileInfo(audioPath)
  const duration = urlDuration ? formatDuration(urlDuration) : 'unknown'
  
  return {
    videoUrl: url,
    videoTitle: extractTitleFromUrl(url),
    videoPublishDate: undefined,
    videoThumbnail: undefined,
    channelTitle: 'Direct URL',
    channelUrl: undefined,
    duration,
    audioFileName,
    audioFileSize
  }
}

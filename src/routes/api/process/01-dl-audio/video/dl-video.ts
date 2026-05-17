import type { VideoMetadata } from '~/types'
import { extractYouTubeId,formatDuration } from '../dl-utils'
import { resolveYouTubeVideoInfo } from './youtube-video-info'

const getBestThumbnail = (thumbnails: any): { url: string | undefined, quality: string | undefined } => {
  if (!thumbnails || typeof thumbnails !== 'object') {
    return { url: undefined, quality: undefined }
  }
  
  const qualityOrder = ['maxres', 'standard', 'high', 'medium', 'default']
  
  for (const quality of qualityOrder) {
    const thumbnail = thumbnails[quality]
    if (thumbnail && typeof thumbnail === 'object' && thumbnail.url && typeof thumbnail.url === 'string') {
      return { url: thumbnail.url, quality }
    }
  }
  
  return { url: undefined, quality: undefined }
}

const getFallbackMetadata = (url: string): VideoMetadata => {
  const videoId = extractYouTubeId(url) || 'unknown'
  return {
    title: `video_${videoId}`,
    duration: 'Unknown',
    author: 'Unknown',
    description: '',
    url,
    publishDate: undefined,
    thumbnail: undefined,
    channelUrl: undefined
  }
}

export const extractVideoMetadata = async (url: string): Promise<VideoMetadata> => {
  try {
    const videoId = extractYouTubeId(url)
    
    if (!videoId) {
      return getFallbackMetadata(url)
    }
    
    const videoInfo = await resolveYouTubeVideoInfo(url)
    
    if (videoInfo && videoInfo.snippet) {
      const snippet = videoInfo.snippet
      const thumbnailResult = getBestThumbnail(snippet.thumbnails)
      
      const metadata: VideoMetadata = {
        title: snippet.title || 'Unknown Title',
        duration: formatDuration(videoInfo.durationSeconds),
        author: snippet.channelTitle || 'Unknown',
        description: snippet.description || '',
        url,
        publishDate: snippet.publishedAt,
        thumbnail: thumbnailResult.url,
        channelUrl: videoInfo.channelUrl
      }
      
      return metadata
    }
    
    return getFallbackMetadata(url)
  } catch (error) {
    return getFallbackMetadata(url)
  }
}

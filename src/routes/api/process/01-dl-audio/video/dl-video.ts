import * as v from 'valibot'
import { l, err } from '~/utils/logging'
import { parseISO8601Duration } from '~/utils/audio'
import {
  YouTubeApiVideoInfoSchema,
  type VideoMetadata,
  type YouTubeApiVideoInfo
} from '~/types'
import { formatDuration, extractYouTubeId } from '../dl-utils'

const YOUTUBE_API_KEY = process.env['YOUTUBE_API_KEY']
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

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

const getYouTubeVideoInfo = async (videoId: string): Promise<YouTubeApiVideoInfo | null> => {
  try {
    if (!YOUTUBE_API_KEY) {
      err(`YOUTUBE_API_KEY not found in environment`)
      return null
    }
    
    const url = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      l(`Failed to fetch video info from YouTube API: ${response.status} ${response.statusText}`)
      return null
    }
    
    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      l(`No video found with ID: ${videoId}`)
      return null
    }
    
    const videoInfo = data.items[0]
    
    if (!videoInfo.snippet) {
      l(`Video info missing snippet data`)
      return null
    }
    
    const validationResult = v.safeParse(YouTubeApiVideoInfoSchema, videoInfo)
    if (!validationResult.success) {
      l(`YouTube API response validation failed: ${v.flatten(validationResult.issues).root?.join(', ')}`)
      return videoInfo as YouTubeApiVideoInfo
    }
    
    return validationResult.output
    
  } catch (error) {
    err(`Failed to get video info from YouTube API`, error)
    return null
  }
}

const formatPublishDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return dateString
  }
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
      l(`Could not extract video ID from URL: ${url}`)
      return getFallbackMetadata(url)
    }
    
    const videoInfo = await getYouTubeVideoInfo(videoId)
    
    if (videoInfo && videoInfo.snippet) {
      const snippet = videoInfo.snippet
      const contentDetails = videoInfo.contentDetails
      
      const durationSeconds = contentDetails?.duration ? parseISO8601Duration(contentDetails.duration) : undefined
      const thumbnailResult = getBestThumbnail(snippet.thumbnails)
      const channelUrl = snippet.channelId ? `https://www.youtube.com/channel/${snippet.channelId}` : undefined
      
      const metadata: VideoMetadata = {
        title: snippet.title || 'Unknown Title',
        duration: durationSeconds ? formatDuration(durationSeconds) : 'Unknown',
        author: snippet.channelTitle || 'Unknown',
        description: snippet.description || '',
        url,
        publishDate: snippet.publishedAt ? formatPublishDate(snippet.publishedAt) : undefined,
        thumbnail: thumbnailResult.url,
        channelUrl
      }
      
      l('Extracted video metadata', {
        title: metadata.title,
        author: metadata.author,
        duration: metadata.duration,
        publishDate: metadata.publishDate,
        thumbnailQuality: thumbnailResult.quality,
        channelUrl: metadata.channelUrl
      })
      return metadata
    }
    
    return getFallbackMetadata(url)
  } catch (error) {
    err(`Failed to extract video metadata`, error)
    return getFallbackMetadata(url)
  }
}
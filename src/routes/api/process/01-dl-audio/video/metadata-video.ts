import { l, err } from "~/utils/logging"
import { parseISO8601Duration, formatDurationHuman, formatFileSize } from '~/utils/audio'
import { executeCommand, extractYouTubeId } from '../dl-utils'

const YOUTUBE_API_KEY = process.env['YOUTUBE_API_KEY']
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

export const getYouTubeMetadata = async (url: string): Promise<{ duration?: number }> => {
  if (!YOUTUBE_API_KEY) {
    err(`YOUTUBE_API_KEY not found in environment`)
    throw new Error('YOUTUBE_API_KEY environment variable is required for YouTube URLs')
  }
  
  try {
    l('Getting YouTube metadata')
    
    const videoId = extractYouTubeId(url)
    
    if (!videoId) {
      l('Could not extract video ID from YouTube URL')
      return {}
    }
    
    const apiUrl = `${YOUTUBE_API_BASE}/videos?part=contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
    
    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      l(`YouTube API returned ${response.status}`)
      return {}
    }
    
    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      l('No video found for ID')
      return {}
    }
    
    const contentDetails = data.items[0]?.contentDetails
    const durationISO = contentDetails?.duration
    
    if (!durationISO) {
      l('No duration found in YouTube API response')
      return {}
    }
    
    const duration = parseISO8601Duration(durationISO)
    l(`YouTube video duration: ${formatDurationHuman(duration)}`)
    
    return { duration }
  } catch (error) {
    err(`Failed to get YouTube metadata`, error)
    throw error
  }
}

export const getNonYouTubeStreamingMetadata = async (url: string): Promise<{ duration?: number, fileSize?: number }> => {
  try {
    l('Getting streaming metadata with yt-dlp')
    
    const result = await executeCommand('yt-dlp', [
      '--dump-json',
      '--no-playlist',
      '--quiet',
      url
    ])
    
    if (result.exitCode !== 0) {
      l('yt-dlp failed to get metadata')
      return {}
    }
    
    const data = JSON.parse(result.stdout)
    
    const duration = data.duration ? parseFloat(data.duration) : undefined
    const fileSize = data.filesize || data.filesize_approx ? 
      parseInt(data.filesize || data.filesize_approx) : undefined
    
    if (duration) {
      l(`Streaming duration: ${formatDurationHuman(duration)}`)
    }
    if (fileSize) {
      l(`Streaming file size: ${formatFileSize(fileSize)}`)
    }
    
    return {
      ...(duration !== undefined && { duration }),
      ...(fileSize !== undefined && { fileSize })
    }
  } catch (error) {
    err(`Failed to get streaming metadata`, error)
    return {}
  }
}

import { json } from "@solidjs/router"
import type { APIEvent } from "@solidjs/start/server"
import * as v from 'valibot'
import { l, err } from "../../utils/logging"
import { executeCommand } from '~/routes/api/process/01-dl-audio/dl-video'
import type { UrlType, UrlMetadata } from '~/types/main'
import { VerifyUrlRequestSchema, validationErrorResponse } from '~/types/main'

const YOUTUBE_API_KEY = process.env['YOUTUBE_API_KEY']
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

const STREAMING_PATTERNS = [
  /youtube\.com\/watch/i,
  /youtu\.be\//i,
  /vimeo\.com\//i,
  /twitch\.tv\//i,
  /dailymotion\.com\//i,
  /facebook\.com\/watch/i,
  /soundcloud\.com\//i
]

const DIRECT_FILE_EXTENSIONS = [
  '.mp3', '.mp4', '.wav', '.m4a', '.flac', '.ogg', '.webm',
  '.mpeg', '.mpga', '.avi', '.mov', '.mkv', '.aac', '.wma'
]

const extractVideoIdFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1)
    }
    
    if (urlObj.hostname.includes('youtube.com')) {
      const videoId = urlObj.searchParams.get('v')
      if (videoId) {
        return videoId
      }
    }
    
    return null
  } catch {
    return null
  }
}

const parseISO8601Duration = (duration: string): number => {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
  const matches = duration.match(regex)
  
  if (!matches) {
    return 0
  }
  
  const hours = parseInt(matches[1] || '0')
  const minutes = parseInt(matches[2] || '0')
  const seconds = parseInt(matches[3] || '0')
  
  return hours * 3600 + minutes * 60 + seconds
}

const detectUrlType = (url: string): UrlType => {
  try {
    const urlObj = new URL(url)
    
    const isStreaming = STREAMING_PATTERNS.some(pattern => pattern.test(url))
    if (isStreaming) {
      const isYoutube = /youtube\.com|youtu\.be/i.test(url)
      return isYoutube ? 'youtube' : 'streaming'
    }
    
    const pathname = urlObj.pathname.toLowerCase()
    const isDirectFile = DIRECT_FILE_EXTENSIONS.some(ext => pathname.endsWith(ext))
    if (isDirectFile) {
      return 'direct-file'
    }
    
    return 'invalid'
  } catch {
    return 'invalid'
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

const getDirectFileMetadata = async (url: string): Promise<{ duration?: number, fileSize?: number, mimeType?: string }> => {
  try {
    l('Getting direct file metadata')
    
    const headResult = await executeCommand('curl', [
      '-sI',
      '-L',
      url
    ])
    
    let fileSize: number | undefined = undefined
    const contentLengthMatch = headResult.stdout.match(/content-length:\s*(\d+)/i)
    if (contentLengthMatch?.[1]) {
      fileSize = parseInt(contentLengthMatch[1])
      l(`Direct file size: ${formatFileSize(fileSize)}`)
    }
    
    let mimeType: string | undefined = undefined
    const contentTypeMatch = headResult.stdout.match(/content-type:\s*([^\r\n]+)/i)
    if (contentTypeMatch?.[1]) {
      mimeType = contentTypeMatch[1].trim()
      l(`Direct file MIME type: ${mimeType}`)
    }
    
    const probeResult = await executeCommand('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      url
    ])
    
    let duration: number | undefined = undefined
    if (probeResult.exitCode === 0 && probeResult.stdout.trim()) {
      duration = parseFloat(probeResult.stdout.trim())
      l(`Direct file duration: ${formatDuration(duration)}`)
    }
    
    return { 
      ...(duration !== undefined && { duration }),
      ...(fileSize !== undefined && { fileSize }),
      ...(mimeType !== undefined && { mimeType })
    }
  } catch (error) {
    err(`Failed to get direct file metadata`, error)
    return {}
  }
}

const getYouTubeMetadata = async (url: string): Promise<{ duration?: number }> => {
  if (!YOUTUBE_API_KEY) {
    err(`YOUTUBE_API_KEY not found in environment`)
    throw new Error('YOUTUBE_API_KEY environment variable is required for YouTube URLs')
  }
  
  try {
    l('Getting YouTube metadata')
    
    const videoId = extractVideoIdFromUrl(url)
    
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
    l(`YouTube video duration: ${formatDuration(duration)}`)
    
    return { duration }
  } catch (error) {
    err(`Failed to get YouTube metadata`, error)
    throw error
  }
}

const getNonYouTubeStreamingMetadata = async (url: string): Promise<{ duration?: number, fileSize?: number }> => {
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
      l(`Streaming duration: ${formatDuration(duration)}`)
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

const verifyUrl = async (url: string): Promise<UrlMetadata> => {
  l(`Verifying URL type and metadata`)
  
  const urlType = detectUrlType(url)
  l(`Detected URL type: ${urlType}`)
  
  if (urlType === 'invalid') {
    l('Invalid URL or unsupported format')
    return {
      urlType,
      error: 'Invalid URL or unsupported format'
    }
  }
  
  let metadata: { duration?: number, fileSize?: number, mimeType?: string } = {}
  
  if (urlType === 'direct-file') {
    metadata = await getDirectFileMetadata(url)
  } else if (urlType === 'youtube') {
    metadata = await getYouTubeMetadata(url)
  } else if (urlType === 'streaming') {
    metadata = await getNonYouTubeStreamingMetadata(url)
  }
  
  const result: UrlMetadata = {
    urlType,
    ...(metadata.duration !== undefined && { 
      duration: metadata.duration,
      durationFormatted: formatDuration(metadata.duration)
    }),
    ...(metadata.fileSize !== undefined && { 
      fileSize: metadata.fileSize,
      fileSizeFormatted: formatFileSize(metadata.fileSize)
    }),
    ...(metadata.mimeType !== undefined && { mimeType: metadata.mimeType })
  }
  
  l('URL verification complete')
  return result
}

export async function POST({ request }: APIEvent) {
  try {
    const body = await request.json()
    
    const bodyResult = v.safeParse(VerifyUrlRequestSchema, body)
    if (!bodyResult.success) {
      return validationErrorResponse(bodyResult.issues)
    }
    
    const { url } = bodyResult.output
    
    l(`Verifying URL: ${url}`)
    
    const metadata = await verifyUrl(url)
    
    if (metadata.error) {
      return json(metadata, { status: 200 })
    }
    
    l(`URL verified: ${metadata.urlType}`)
    return json(metadata)
  } catch (error) {
    err("Failed to verify URL", error)
    return json(
      { error: "Failed to verify URL" },
      { status: 500 }
    )
  }
}
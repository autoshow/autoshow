import * as v from 'valibot'
import { l, err } from '~/utils/logging'
import type { VideoMetadata, Step1Metadata, YouTubeApiVideoInfo, DownloadOptions } from '~/types/main'
import { YouTubeApiVideoInfoSchema } from '~/types/main'
import {
  executeCommand,
  sanitizeFilename,
  getDuration,
  formatDuration,
  convertSmallFile,
  convertLargeFile,
  VIDEO_EXTENSIONS,
  LARGE_FILE_THRESHOLD,
  type ConvertToAudioResult
} from './dl-utils'

const YOUTUBE_API_KEY = process.env['YOUTUBE_API_KEY']
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

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
  const videoId = extractVideoIdFromUrl(url) || 'unknown'
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
    const videoId = extractVideoIdFromUrl(url)
    
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

export const createVideoMetadata = (
  url: string,
  audioPath: string,
  videoMetadata: VideoMetadata
): Step1Metadata => {
  const audioFile = Bun.file(audioPath)
  const audioFileSize = audioFile.size
  const audioFileName = audioPath.split('/').pop() || 'audio.wav'
  
  return {
    videoUrl: url,
    videoTitle: videoMetadata.title,
    videoPublishDate: videoMetadata.publishDate,
    videoThumbnail: videoMetadata.thumbnail,
    channelTitle: videoMetadata.author,
    channelUrl: videoMetadata.channelUrl,
    duration: videoMetadata.duration,
    audioFileName,
    audioFileSize
  }
}

export { type ConvertToAudioResult }

export const convertVideoToAudio = async (
  inputPath: string, 
  outputDir: string,
  filePrefix: string
): Promise<ConvertToAudioResult> => {
  try {
    const inputFile = Bun.file(inputPath)
    const fileSize = inputFile.size
    
    if (fileSize < 1000) {
      throw new Error(`File is too small (${fileSize} bytes), likely corrupted or empty`)
    }
    
    const inputFilename = inputPath.split('/').pop() || 'video'
    const namePart = inputFilename.replace(/\.[^/.]+$/, '')
    const sanitizedName = sanitizeFilename(namePart)
    const baseName = `${filePrefix}-${sanitizedName}`
    
    const isVideo = VIDEO_EXTENSIONS.test(inputFilename)
    const isLargeFile = fileSize >= LARGE_FILE_THRESHOLD

    const wavPath = `${outputDir}/${baseName}.wav`
    const mp3Path = `${outputDir}/${baseName}.mp3`

    if (isLargeFile) {
      await convertLargeFile(inputPath, wavPath, mp3Path, isVideo)
    } else {
      await convertSmallFile(inputPath, wavPath, mp3Path, isVideo)
    }
    
    const duration = await getDuration(wavPath)
    
    l('Converted video to audio', {
      inputPath,
      wavPath,
      mp3Path,
      isLargeFile,
      duration
    })

    const result: ConvertToAudioResult = {
      wavPath,
      mp3Path
    }

    if (duration !== undefined) {
      result.duration = duration
    }

    return result
  } catch (error) {
    err(`Failed to convert to audio`, error)
    throw error
  }
}

const checkAria2Installed = async (): Promise<boolean> => {
  try {
    const result = await executeCommand('which', ['aria2c'])
    return result.exitCode === 0
  } catch {
    return false
  }
}

export const resilientDownload = async (options: DownloadOptions): Promise<void> => {
  const {
    url,
    outputPath,
    maxConnections = 16,
    maxSplit = 16,
    retryWait = 30
  } = options

  const aria2Installed = await checkAria2Installed()
  if (!aria2Installed) {
    err('aria2c is not installed')
    throw new Error('aria2c is required but not found. This application must be run in Docker.')
  }

  let existingFileSize: number | undefined
  if (await Bun.file(outputPath).exists()) {
    const statResult = await executeCommand('stat', ['-f', '%z', outputPath])
    existingFileSize = statResult.exitCode === 0 
      ? parseInt(statResult.stdout.trim())
      : parseInt((await executeCommand('stat', ['-c', '%s', outputPath])).stdout.trim())
  }

  const normalized = outputPath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  const dir = lastSlash === -1 ? '.' : lastSlash === 0 ? '/' : normalized.slice(0, lastSlash)
  const file = normalized.split('/').pop() || ''

  const args = [
    'aria2c',
    '--console-log-level=warn',
    '--summary-interval=10',
    '--allow-overwrite=true',
    '--auto-file-renaming=false',
    '--continue=true',
    '--max-tries=0',
    `--retry-wait=${retryWait}`,
    '--timeout=60',
    '--connect-timeout=10',
    `--max-connection-per-server=${maxConnections}`,
    `--split=${maxSplit}`,
    '--min-split-size=1M',
    '--file-allocation=none',
    '--disk-cache=64M',
    '--check-certificate=true',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    `--dir=${dir}`,
    `--out=${file}`,
    url
  ]

  const startTime = Date.now()
  const result = await executeCommand('aria2c', args.slice(1))
  const elapsedMs = Date.now() - startTime

  if (result.exitCode !== 0) {
    throw new Error(`Download failed with exit code ${result.exitCode}: ${result.stderr}`)
  }

  if (!(await Bun.file(outputPath).exists())) {
    throw new Error('Download completed but file does not exist')
  }

  const finalStatResult = await executeCommand('stat', ['-f', '%z', outputPath])
  const finalSize = finalStatResult.exitCode === 0 
    ? parseInt(finalStatResult.stdout.trim())
    : parseInt((await executeCommand('stat', ['-c', '%s', outputPath])).stdout.trim())
    
  l('Resilient download completed', {
    url,
    outputPath,
    fileSizeBytes: finalSize,
    fileSizeGB: (finalSize / 1e9).toFixed(2),
    elapsedMs,
    maxConnections,
    resumed: existingFileSize !== undefined
  })
}

export const getRemoteFileSize = async (url: string): Promise<number> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    const contentLength = response.headers.get('content-length')
    
    if (contentLength) {
      return parseInt(contentLength)
    }
    
    return 0
  } catch {
    return 0
  }
}

export const downloadVideo = async (url: string, outputDir: string, useResilient: boolean = false): Promise<string> => {
  try {
    if (useResilient) {
      return await downloadVideoResilient(url, outputDir)
    }
    
    const baseArgs = [
      '--extract-audio',
      '--audio-format', 'mp3',
      '--output', `${outputDir}/%(title)s.%(ext)s`,
      '--restrict-filenames',
      '--no-playlist',
      '--quiet',
      '--progress',
      '--no-warnings',
      '--retries', '10',
      '--fragment-retries', '10',
      url
    ]
    
    const result = await executeCommand('yt-dlp', baseArgs)
    
    if (result.exitCode !== 0) {
      throw new Error(`yt-dlp failed: ${result.stderr}`)
    }
    
    const files = await Bun.$`find ${outputDir} -type f -name "*.mp3" -o -name "*.m4a" -o -name "*.webm" -o -name "*.mp4"`.text()
    const fileList = files.trim().split('\n').filter(f => f.length > 0)
    
    if (fileList.length === 0 || !fileList[0]) {
      throw new Error('No downloaded files found')
    }
    
    const downloadedFile = fileList[0]
    
    l('Downloaded video with yt-dlp', {
      url,
      outputFile: downloadedFile
    })
    
    return downloadedFile
    
  } catch (error) {
    err(`Failed to download with yt-dlp`, error)
    throw error
  }
}

const downloadVideoResilient = async (url: string, outputDir: string): Promise<string> => {
  try {
    const downloadPath = `${outputDir}/download.mp4`
    
    await resilientDownload({
      url,
      outputPath: downloadPath,
      maxConnections: 16,
      maxSplit: 16
    })
    
    return downloadPath
    
  } catch (error) {
    err(`Failed to download with aria2c`, error)
    throw error
  }
}

export { executeCommand }

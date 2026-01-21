import { l, err } from '~/utils/logging'
import type { Step1Metadata, DurationResult } from '~/types/main'
import {
  executeCommand,
  sanitizeFilename,
  getDuration,
  formatDuration,
  type ConvertToAudioResult
} from './dl-utils'

const probeUrlForVideo = async (url: string): Promise<boolean> => {
  try {
    const result = await executeCommand('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_type',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      url
    ])
    
    return result.stdout.trim() === 'video'
  } catch {
    return false
  }
}

export const convertDirectUrlToAudio = async (
  inputUrl: string, 
  outputDir: string,
  filePrefix: string
): Promise<ConvertToAudioResult> => {
  try {
    const isVideo = await probeUrlForVideo(inputUrl)
    const urlPathName = inputUrl.split('/').pop()?.split('?')[0] || 'direct-url'
    const sanitizedName = sanitizeFilename(urlPathName.replace(/\.[^/.]+$/, ''))
    const baseName = `${filePrefix}-${sanitizedName || 'direct-url'}`

    const wavPath = `${outputDir}/${baseName}.wav`
    const mp3Path = `${outputDir}/${baseName}.mp3`
    
    l('Converting to audio', { wavPath, mp3Path })

    const args = [
      '-i', inputUrl,
      ...(isVideo ? ['-vn'] : []),
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      '-y',
      wavPath,
      ...(isVideo ? ['-vn'] : []),
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'libmp3lame',
      '-b:a', '32k',
      '-af', 'lowpass=f=8000',
      '-y',
      mp3Path
    ]

    const result = await executeCommand('ffmpeg', args)

    if (result.exitCode !== 0) {
      err(`FFmpeg conversion failed with exit code ${result.exitCode}`)
      throw new Error(`Failed to convert to audio: ${result.stderr}`)
    }

    l('Converted to audio successfully')
    
    const duration = await getDuration(wavPath)

    const audioResult: ConvertToAudioResult = {
      wavPath,
      mp3Path
    }

    if (duration !== undefined) {
      audioResult.duration = duration
    }

    return audioResult
  } catch (error) {
    err(`Failed to convert to audio`, error)
    throw error
  }
}

const extractTitleFromUrl = (url: string): string => {
  const urlPathName = url.split('/').pop()?.split('?')[0] || ''
  const nameWithoutExtension = urlPathName.replace(/\.[^/.]+$/, '')
  return nameWithoutExtension || url
}

export const createDirectUrlMetadata = (
  url: string,
  audioPath: string,
  urlDuration?: number
): Step1Metadata => {
  const audioFile = Bun.file(audioPath)
  const audioFileSize = audioFile.size
  const audioFileName = audioPath.split('/').pop() || 'audio.wav'
  
  l('Final audio file', { fileName: audioFileName, size: `${audioFileSize} bytes` })
  
  const duration = urlDuration 
    ? `${Math.floor(urlDuration / 60)}:${Math.floor(urlDuration % 60).toString().padStart(2, '0')}` 
    : 'unknown'
  
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

export const detectDuration = async (url: string, skipDuration: boolean): Promise<DurationResult> => {
  if (skipDuration) {
    l('Duration detection skipped by user')
    return {
      duration: 0,
      formatted: 'unknown',
      method: 'skipped',
      requiresFullDownload: true
    }
  }

  l('Detecting duration before download')

  try {
    const headResponse = await fetch(url, { method: 'HEAD' })
    const contentType = (headResponse.headers.get('content-type') || '').toLowerCase()
    const acceptRanges = (headResponse.headers.get('accept-ranges') || '').toLowerCase()
    const rangeable = acceptRanges.includes('bytes')
    const isHLS = url.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('hls')

    if (isHLS) {
      const result = await probeHLS(url)
      if (result) {
        l('HLS duration detected', { duration: formatDuration(result) })
        return {
          duration: result,
          formatted: formatDuration(result),
          method: 'hls',
          requiresFullDownload: false
        }
      }
    }

    if (rangeable || contentType.match(/(mp4|quicktime|webm|matroska|mpeg)/)) {
      const result = await probeHTTP(url)
      if (result) {
        l('HTTP probe duration detected', { duration: formatDuration(result) })
        return {
          duration: result,
          formatted: formatDuration(result),
          method: 'ffprobe_http',
          requiresFullDownload: false
        }
      }
    }
  } catch (error) {
    l('Duration pre-probe failed', { error: error instanceof Error ? error.message : 'unknown error' })
  }

  l('Cannot determine duration without full download')
  return {
    duration: 0,
    formatted: 'unknown',
    method: 'full',
    requiresFullDownload: true
  }
}

const probeHLS = async (url: string): Promise<number | null> => {
  try {
    l('Attempting HLS playlist duration detection')
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HLS fetch failed: ${response.status}`)
    }

    const text = await response.text()
    let totalDuration = 0

    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^#EXTINF:([0-9]+(?:\.[0-9]+)?)/)
      if (match) {
        totalDuration += parseFloat(match[1]!)
      }
    }

    const isVOD = /#EXT-X-ENDLIST/.test(text)
    
    if (!isVOD) {
      l('HLS stream is live (no ENDLIST), cannot determine exact duration')
      return null
    }

    if (totalDuration <= 0) {
      return null
    }

    return totalDuration
  } catch (error) {
    l('HLS probe failed', { error: error instanceof Error ? error.message : 'unknown error' })
    return null
  }
}

const probeHTTP = async (url: string): Promise<number | null> => {
  try {
    l('Attempting HTTP probe for duration')

    const result = await executeCommand('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      '-rw_timeout', '15000000',
      '-protocol_whitelist', 'file,http,https,tcp,tls',
      url
    ])

    if (result.exitCode !== 0) {
      throw new Error('ffprobe failed')
    }

    const duration = parseFloat(result.stdout.trim())

    if (!isFinite(duration) || duration <= 0) {
      return null
    }

    return duration
  } catch (error) {
    l('HTTP probe failed', { error: error instanceof Error ? error.message : 'unknown error' })
    return null
  }
}

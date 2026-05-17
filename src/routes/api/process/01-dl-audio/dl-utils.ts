import type { CommandResult,ConvertToAudioResult,SupportedDocumentType } from '~/types'
import { uploadToS3 } from '~/utils/s3-utils'
import { getPublicHttpUrlHeaders } from '~/utils/security/public-http'

export const VIDEO_EXTENSIONS = /\.(mp4|mkv|avi|mov|webm|wmv|flv|m4v)$/i

export const getDocumentType = (pathOrName: string): SupportedDocumentType | null => {
  let value = pathOrName
  try {
    value = new URL(pathOrName).pathname
  } catch {
  }

  const ext = value.toLowerCase().split('.').pop()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'png') return 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg'
  if (ext === 'tiff' || ext === 'tif') return 'tiff'
  if (ext === 'txt') return 'txt'
  if (ext === 'docx') return 'docx'
  if (ext === 'pptx') return 'pptx'
  if (ext === 'xlsx') return 'xlsx'
  return null
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

const normalizeYouTubeVideoId = (value: string | null | undefined): string | null => {
  if (!value) return null

  const normalized = value.trim()
  return YOUTUBE_VIDEO_ID_PATTERN.test(normalized) ? normalized : null
}

export const extractYouTubeId = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    const pathSegments = urlObj.pathname.split('/').filter(Boolean)

    if (hostname === 'youtu.be' || hostname.endsWith('.youtu.be')) {
      return normalizeYouTubeVideoId(pathSegments[0])
    }

    if (hostname !== 'youtube.com' && !hostname.endsWith('.youtube.com')) {
      return null
    }

    const queryVideoId = normalizeYouTubeVideoId(urlObj.searchParams.get('v'))
    if (queryVideoId) {
      return queryVideoId
    }

    if (pathSegments.length >= 2 && ['embed', 'shorts', 'live'].includes(pathSegments[0] || '')) {
      return normalizeYouTubeVideoId(pathSegments[1])
    }

    return null
  } catch {
    return null
  }
}

export const fetchUrlHeaders = async (url: string): Promise<{ fileSize?: number, mimeType?: string }> => {
  try {
    const headers = await getPublicHttpUrlHeaders(url)

    let fileSize: number | undefined
    const contentLength = headers['content-length']
    if (contentLength) {
      const parsedLength = parseInt(contentLength, 10)
      if (Number.isFinite(parsedLength)) {
        fileSize = parsedLength
      }
    }
    
    let mimeType: string | undefined
    if (headers['content-type']) {
      mimeType = headers['content-type'].trim()
    }
    
    return {
      ...(fileSize !== undefined && { fileSize }),
      ...(mimeType !== undefined && { mimeType })
    }
  } catch (error) {
    return {}
  }
}

export const getAudioFileInfo = (audioPath: string): { fileName: string, fileSize: number } => {
  const file = Bun.file(audioPath)
  const fileName = audioPath.split('/').pop() || 'audio.wav'
  return { fileName, fileSize: file.size }
}

export const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024
const DEFAULT_COMMAND_TIMEOUT_MS = 300_000

export const executeCommand = async (
  command: string,
  args: string[] = [],
  timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS
): Promise<CommandResult> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    const proc = Bun.spawn([command, ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: process.env as Record<string, string | undefined>
    })

    const commandPromise = (async (): Promise<CommandResult> => {
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited
      ])

      if (exitCode !== 0) {
      }

      return {
        stdout,
        stderr: stderr || stdout,
        exitCode
      }
    })()

    void commandPromise.catch(() => undefined)

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        proc.kill()
        reject(new Error(`Command ${command} timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    return await Promise.race([commandPromise, timeoutPromise])
  } catch (error) {
    throw error
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export const sanitizeFilename = (filename: string): string => {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export const getDuration = async (path: string): Promise<number | undefined> => {
  try {
    const result = await executeCommand('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      path
    ])
    
    const duration = parseFloat(result.stdout.trim())
    return isFinite(duration) && duration > 0 ? duration : undefined
  } catch {
    return undefined
  }
}

export const formatDuration = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return 'unknown'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export const convertSmallFile = async (
  inputPath: string,
  wavPath: string,
  mp3Path: string,
  isVideo: boolean,
  jobId?: string
): Promise<ConvertToAudioResult> => {
  const baseArgs = isVideo ? ['-i', inputPath, '-vn'] : ['-i', inputPath]

  const wavArgs = [
    ...baseArgs,
    '-ar', '16000',
    '-ac', '1',
    '-c:a', 'pcm_s16le',
    '-y',
    wavPath
  ]

  const mp3Args = [
    ...baseArgs,
    '-ar', '16000',
    '-ac', '1',
    '-c:a', 'libmp3lame',
    '-b:a', '32k',
    '-af', 'lowpass=f=8000',
    '-y',
    mp3Path
  ]

  const [wavResult, mp3Result] = await Promise.all([
    executeCommand('ffmpeg', wavArgs),
    executeCommand('ffmpeg', mp3Args)
  ])

  if (wavResult.exitCode !== 0) {
    throw new Error(`Failed to convert to WAV: ${wavResult.stderr}`)
  }

  if (mp3Result.exitCode !== 0) {
    throw new Error(`Failed to convert to MP3: ${mp3Result.stderr}`)
  }

  let wavS3Url: string | undefined
  let mp3S3Url: string | undefined

  if (jobId) {
    const [wavUpload, mp3Upload] = await Promise.all([
      uploadToS3(wavPath, jobId, 'audio'),
      uploadToS3(mp3Path, jobId, 'audio')
    ])
    wavS3Url = wavUpload?.s3Url
    mp3S3Url = mp3Upload?.s3Url
  }

  return { wavPath, mp3Path, wavS3Url, mp3S3Url }
}

export const convertLargeFile = async (
  inputPath: string,
  wavPath: string,
  mp3Path: string,
  isVideo: boolean,
  jobId?: string
): Promise<ConvertToAudioResult> => {
  const args = [
    '-i', inputPath,
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
    throw new Error(`Failed to convert to audio: ${result.stderr}`)
  }

  let wavS3Url: string | undefined
  let mp3S3Url: string | undefined

  if (jobId) {
    const [wavUpload, mp3Upload] = await Promise.all([
      uploadToS3(wavPath, jobId, 'audio'),
      uploadToS3(mp3Path, jobId, 'audio')
    ])
    wavS3Url = wavUpload?.s3Url
    mp3S3Url = mp3Upload?.s3Url
  }

  return { wavPath, mp3Path, wavS3Url, mp3S3Url }
}

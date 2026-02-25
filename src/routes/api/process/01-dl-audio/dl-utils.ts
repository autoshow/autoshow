import { l, err } from '~/utils/logging'
import { uploadToS3 } from '~/utils/s3-upload'
import type { CommandResult, SupportedDocumentType, ConvertToAudioResult } from '~/types'

export const VIDEO_EXTENSIONS = /\.(mp4|mkv|avi|mov|webm|wmv|flv|m4v)$/i

export const getDocumentType = (pathOrName: string): SupportedDocumentType | null => {
  const ext = pathOrName.toLowerCase().split('.').pop()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'png') return 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg'
  if (ext === 'tiff' || ext === 'tif') return 'tiff'
  if (ext === 'txt') return 'txt'
  if (ext === 'docx') return 'docx'
  return null
}

export const extractYouTubeId = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1)
    }
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v')
    }
    return null
  } catch {
    return null
  }
}

export const fetchUrlHeaders = async (url: string): Promise<{ fileSize?: number, mimeType?: string }> => {
  try {
    const result = await executeCommand('curl', ['-sI', '-L', url])
    
    let fileSize: number | undefined
    const sizeMatch = result.stdout.match(/content-length:\s*(\d+)/i)
    if (sizeMatch?.[1]) {
      fileSize = parseInt(sizeMatch[1])
    }
    
    let mimeType: string | undefined
    const typeMatch = result.stdout.match(/content-type:\s*([^\r\n]+)/i)
    if (typeMatch?.[1]) {
      mimeType = typeMatch[1].trim()
    }
    
    return {
      ...(fileSize !== undefined && { fileSize }),
      ...(mimeType !== undefined && { mimeType })
    }
  } catch (error) {
    err('Failed to fetch URL headers', error)
    return {}
  }
}

export const getAudioFileInfo = (audioPath: string): { fileName: string, fileSize: number } => {
  const file = Bun.file(audioPath)
  const fileName = audioPath.split('/').pop() || 'audio.wav'
  l('Final audio file', { fileName, size: `${file.size} bytes` })
  return { fileName, fileSize: file.size }
}

export const buildDualOutputArgs = (
  inputPath: string,
  wavPath: string,
  mp3Path: string,
  isVideo: boolean
): string[] => {
  return [
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
}
export const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024

export const executeCommand = async (command: string, args: string[] = []): Promise<CommandResult> => {
  try {
    const proc = Bun.spawn([command, ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: process.env as Record<string, string | undefined>
    })
    
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited
    
    if (exitCode !== 0) {
      l(`Command ${command} exited with code ${exitCode}`)
    }
    
    return {
      stdout,
      stderr: stderr || stdout,
      exitCode
    }
  } catch (error) {
    err(`Failed to execute command: ${command}`, error)
    throw error
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
    err(`FFmpeg WAV conversion failed with exit code ${wavResult.exitCode}`)
    throw new Error(`Failed to convert to WAV: ${wavResult.stderr}`)
  }

  if (mp3Result.exitCode !== 0) {
    err(`FFmpeg MP3 conversion failed with exit code ${mp3Result.exitCode}`)
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
    err(`FFmpeg conversion failed with exit code ${result.exitCode}`)
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

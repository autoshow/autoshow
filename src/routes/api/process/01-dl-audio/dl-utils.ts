import { l, err } from '~/utils/logging'
import type { CommandResult } from '~/types/main'
export type { ConvertToAudioResult } from '~/types/main'

export const VIDEO_EXTENSIONS = /\.(mp4|mkv|avi|mov|webm|wmv|flv|m4v)$/i
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
  isVideo: boolean
): Promise<void> => {
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
}

export const convertLargeFile = async (
  inputPath: string,
  wavPath: string,
  mp3Path: string,
  isVideo: boolean
): Promise<void> => {
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
}

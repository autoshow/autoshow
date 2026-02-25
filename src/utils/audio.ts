import { err } from '~/utils/logging'
import { spawn } from 'child_process'

export const countTokens = (text: string): number => {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

export const formatTimestamp = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export const calculateAudioDuration = async (audioPath: string): Promise<number> => {
  try {
    const result = await Bun.$`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${audioPath}`.text()
    const duration = parseFloat(result.trim())
    return isFinite(duration) ? duration : 0
  } catch (error) {
    err('Failed to calculate audio duration', error)
    return 0
  }
}

export const parseISO8601Duration = (duration: string): number => {
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

export const extractTitleFromUrl = (url: string): string => {
  const urlPathName = url.split('/').pop()?.split('?')[0] || ''
  const nameWithoutExtension = urlPathName.replace(/\.[^/.]+$/, '')
  return nameWithoutExtension || url
}

export const formatDurationHuman = (seconds: number): string => {
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

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export const convertPcmToMp3 = async (pcmData: Buffer, outputPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      '-i', 'pipe:0',
      '-codec:a', 'libmp3lame',
      '-b:a', '192k',
      outputPath
    ])

    let stderrOutput = ''

    ffmpeg.stderr.on('data', (data) => {
      stderrOutput += data.toString()
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderrOutput}`))
      }
    })

    ffmpeg.on('error', (error) => {
      reject(error)
    })

    ffmpeg.stdin.write(pcmData)
    ffmpeg.stdin.end()
  })
}

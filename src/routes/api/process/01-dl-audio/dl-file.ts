import { l, err } from '~/utils/logging'
import type { VideoMetadata, Step1Metadata } from '~/types/main'
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

export const extractLocalFileMetadata = async (filePath: string, fileName: string): Promise<VideoMetadata> => {
  try {
    const result = await executeCommand('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ])
    
    const durationSeconds = parseFloat(result.stdout.trim())
    const duration = formatDuration(durationSeconds)
    
    return {
      title: fileName.replace(/\.[^/.]+$/, ''),
      duration,
      author: 'Local File',
      description: `Processed from local file: ${fileName}`,
      url: `file://${filePath}`,
      publishDate: undefined,
      thumbnail: undefined,
      channelUrl: undefined
    }
  } catch (error) {
    err(`Failed to extract local file metadata`, error)
    return {
      title: fileName.replace(/\.[^/.]+$/, ''),
      duration: 'Unknown',
      author: 'Local File',
      description: `Processed from local file: ${fileName}`,
      url: `file://${filePath}`,
      publishDate: undefined,
      thumbnail: undefined,
      channelUrl: undefined
    }
  }
}

export const createFileMetadata = (
  filePath: string,
  audioPath: string,
  metadata: VideoMetadata
): Step1Metadata => {
  const audioFile = Bun.file(audioPath)
  const audioFileSize = audioFile.size
  const audioFileName = audioPath.split('/').pop() || 'audio.wav'
  
  l('Final audio file', { fileName: audioFileName, size: `${audioFileSize} bytes` })
  
  return {
    videoUrl: `file://${filePath}`,
    videoTitle: metadata.title,
    videoPublishDate: metadata.publishDate,
    videoThumbnail: metadata.thumbnail,
    channelTitle: metadata.author,
    channelUrl: metadata.channelUrl,
    duration: metadata.duration,
    audioFileName,
    audioFileSize
  }
}

export const convertFileToAudio = async (
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
    
    const inputFilename = inputPath.split('/').pop() || 'audio'
    const namePart = inputFilename.replace(/\.[^/.]+$/, '')
    const sanitizedName = sanitizeFilename(namePart)
    const baseName = `${filePrefix}-${sanitizedName}`
    
    const isVideo = VIDEO_EXTENSIONS.test(inputFilename)
    const isLargeFile = fileSize >= LARGE_FILE_THRESHOLD

    const wavPath = `${outputDir}/${baseName}.wav`
    const mp3Path = `${outputDir}/${baseName}.mp3`
    
    l('Converting to audio', { wavPath, mp3Path })

    if (isLargeFile) {
      await convertLargeFile(inputPath, wavPath, mp3Path, isVideo)
    } else {
      await convertSmallFile(inputPath, wavPath, mp3Path, isVideo)
    }

    l('Converted to audio successfully')
    
    const duration = await getDuration(wavPath)

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

export const getLocalFileDuration = async (path: string): Promise<number> => {
  try {
    const result = await executeCommand('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      path
    ])

    if (result.exitCode !== 0) {
      throw new Error('ffprobe failed')
    }

    const duration = parseFloat(result.stdout.trim())

    if (!isFinite(duration) || duration <= 0) {
      throw new Error('Invalid duration')
    }

    return duration
  } catch (error) {
    err('Failed to get local file duration', error)
    throw error
  }
}

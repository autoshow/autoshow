import type { ConvertToAudioResult,Step1Metadata,VideoMetadata } from '~/types'
import {
convertLargeFile,
convertSmallFile,
executeCommand,
formatDuration,
getAudioFileInfo,
getDuration,
LARGE_FILE_THRESHOLD,
sanitizeFilename,
VIDEO_EXTENSIONS
} from '../dl-utils'

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
  const { fileName: audioFileName, fileSize: audioFileSize } = getAudioFileInfo(audioPath)
  
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
    const inputFilename = inputPath.split('/').pop() || 'audio'
    
    
    if (fileSize < 1000) {
      throw new Error(`File is too small (${fileSize} bytes), likely corrupted or empty`)
    }
    
    const namePart = inputFilename.replace(/\.[^/.]+$/, '').replace(/\.\./g, '')
    const sanitizedName = sanitizeFilename(namePart)
    if (!sanitizedName) {
      throw new Error('Invalid filename: sanitization produced an empty name')
    }
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

    const result: ConvertToAudioResult = {
      wavPath,
      mp3Path
    }

    if (duration !== undefined) {
      result.duration = duration
    }

    return result
  } catch (error) {
    throw error
  }
}
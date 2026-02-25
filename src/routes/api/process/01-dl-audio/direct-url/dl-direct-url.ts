import { l, err } from '~/utils/logging'
import type { ConvertToAudioResult } from '~/types'
import {
  executeCommand,
  sanitizeFilename,
  getDuration,
  buildDualOutputArgs
} from '../dl-utils'

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

    const args = buildDualOutputArgs(inputUrl, wavPath, mp3Path, isVideo)
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


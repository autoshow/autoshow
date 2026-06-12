import { rm } from 'node:fs/promises'
import type { ConvertToAudioResult } from '~/types'
import { downloadPublicHttpUrlToFile } from '~/utils/security/public-http'
import { executeCommand,getDuration,sanitizeFilename } from '../dl-utils'
import { getMaxAudioInputBytes } from '../remote-source-limits'

const buildDualOutputArgs = (
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

const probeFileForVideo = async (path: string): Promise<boolean> => {
  try {
    const result = await executeCommand('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_type',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      path
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
    const parsedUrl = new URL(inputUrl)
    const urlPathName = parsedUrl.pathname.split('/').pop()?.split('?')[0] || 'direct-url'
    const sanitizedName = sanitizeFilename(urlPathName.replace(/\.[^/.]+$/, ''))
    const baseName = `${filePrefix}-${sanitizedName || 'direct-url'}`
    const sourceExtension = urlPathName.includes('.') ? `.${urlPathName.split('.').pop()}` : '.bin'
    const sourcePath = `${outputDir}/${baseName}-source${sourceExtension}`

    const wavPath = `${outputDir}/${baseName}.wav`
    const mp3Path = `${outputDir}/${baseName}.mp3`

    await downloadPublicHttpUrlToFile(inputUrl, sourcePath, getMaxAudioInputBytes())
    const isVideo = await probeFileForVideo(sourcePath)

    try {
      const args = buildDualOutputArgs(sourcePath, wavPath, mp3Path, isVideo)
      const result = await executeCommand('ffmpeg', args)

      if (result.exitCode !== 0) {
        throw new Error(`Failed to convert to audio: ${result.stderr}`)
      }

      const duration = await getDuration(wavPath)

      const audioResult: ConvertToAudioResult = {
        wavPath,
        mp3Path
      }

      if (duration !== undefined) {
        audioResult.duration = duration
      }

      return audioResult
    } finally {
      await rm(sourcePath, { force: true })
    }
  } catch (error) {
    throw error
  }
}

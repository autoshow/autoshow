import type { Step7Metadata, MusicGenre, MusicServiceType, MusicGenerationOptions, IProgressTracker } from '~/types'
import { l, err } from '~/utils/logging'
import { calculateAudioDuration } from '~/utils/audio'
import { uploadToS3 } from '~/utils/s3-upload'
import { MUSIC_CONFIG } from '~/models/music-config'
export { requireEnvKey } from '~/utils/env'

const STEP_NUMBER = 7

export const getCostPerMinute = (service: MusicServiceType): number => {
  const serviceConfig = MUSIC_CONFIG[service]
  if (!serviceConfig) return 0
  return serviceConfig.costPerMinute || 0
}

export const handleMusicError = (
  error: unknown,
  serviceName: string,
  progressTracker?: IProgressTracker
): never => {
  err(`${serviceName} music generation failed`, error)
  progressTracker?.error(STEP_NUMBER, 'Music generation failed', error instanceof Error ? error.message : 'Unknown error')
  throw error
}

export const saveMusicFile = async (
  buffer: Buffer,
  outputDir: string,
  jobId?: string
): Promise<{ musicPath: string, musicFileName: string, musicFileSize: number, musicS3Url?: string }> => {
  const musicFileName = 'music.mp3'
  const musicPath = `${outputDir}/${musicFileName}`
  await Bun.write(musicPath, buffer)
  const musicFile = Bun.file(musicPath)
  const musicFileSize = musicFile.size
  l('Music file created', { fileName: musicFileName, size: `${musicFileSize} bytes` })

  let musicS3Url: string | undefined
  if (jobId) {
    const s3Result = await uploadToS3(musicPath, jobId, 'music')
    musicS3Url = s3Result?.s3Url
  }

  return { musicPath, musicFileName, musicFileSize, ...(musicS3Url && { musicS3Url }) }
}

export const buildMusicMetadata = async (
  service: MusicServiceType,
  model: string,
  genre: MusicGenre,
  startTime: number,
  musicPath: string,
  musicFileName: string,
  musicFileSize: number,
  lyrics: string,
  musicOptions: MusicGenerationOptions,
  musicS3Url?: string
): Promise<Step7Metadata> => {
  const measuredDuration = await calculateAudioDuration(musicPath)
  const targetDuration = musicOptions.musicDurationSeconds
  const hasTargetDuration = targetDuration > 0
  const isMeasuredDurationImplausible = hasTargetDuration && (measuredDuration <= 0 || measuredDuration < targetDuration * 0.5 || measuredDuration > targetDuration * 2)
  const usedTargetDurationFallback = hasTargetDuration && isMeasuredDurationImplausible
  const billableDuration = usedTargetDurationFallback ? targetDuration : measuredDuration
  const musicDuration = measuredDuration > 0 ? measuredDuration : (hasTargetDuration ? targetDuration : 0)
  const processingTime = Date.now() - startTime
  const costPerMinute = getCostPerMinute(service)
  const totalCost = (billableDuration / 60) * costPerMinute

  l('Music generation completed', {
    processingTime: `${processingTime}ms`,
    targetDuration: `${targetDuration.toFixed(2)}s`,
    measuredDuration: `${measuredDuration.toFixed(2)}s`,
    musicDuration: `${musicDuration.toFixed(2)}s`,
    billableDuration: `${billableDuration.toFixed(2)}s`,
    usedTargetDurationFallback,
    costPerMinute: `$${costPerMinute.toFixed(4)}/min`,
    totalCost: `$${totalCost.toFixed(4)}`
  })

  return {
    musicService: service,
    musicModel: model,
    selectedGenre: genre,
    processingTime,
    musicFileName,
    musicFileSize,
    musicDuration,
    lyricsLength: lyrics.length,
    lyricsGenerationTime: 0,
    lyricsText: lyrics,
    totalCost,
    musicPreset: musicOptions.musicPreset,
    targetDurationSeconds: musicOptions.musicDurationSeconds,
    instrumental: musicOptions.musicInstrumental,
    sampleRate: musicOptions.musicSampleRate,
    bitrate: musicOptions.musicBitrate,
    musicS3Url
  }
}

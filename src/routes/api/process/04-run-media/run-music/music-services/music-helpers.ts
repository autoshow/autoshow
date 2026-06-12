import { MUSIC_CONFIG } from '~/models/models-config/music-config'
import { findMusicModel } from '~/models/models-utils/model-lookup'
import type { IProgressTracker,MusicGenerationOptions,MusicGenre,MusicServiceType,Step7Metadata } from '~/types'
import { calculateAudioDuration } from '~/utils/audio'
import { uploadToS3 } from '~/utils/s3-utils'
export { requireEnvKey } from '~/utils/env'

export const STEP_NUMBER = 7

const getCostPerMinute = (service: MusicServiceType, model: string): number => {
  const serviceConfig = MUSIC_CONFIG[service]
  if (!serviceConfig) return 0

  return findMusicModel(service, model)?.costPerMinute ?? 0
}

export const handleMusicError = (
  error: unknown,
  _serviceName: string,
  progressTracker?: IProgressTracker
): never => {
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
  musicS3Url?: string,
  totalCostOverride?: number
): Promise<Step7Metadata> => {
  const measuredDuration = await calculateAudioDuration(musicPath)
  const targetDuration = musicOptions.musicDurationSeconds
  const hasTargetDuration = targetDuration > 0
  const isMeasuredDurationImplausible = hasTargetDuration && (measuredDuration <= 0 || measuredDuration < targetDuration * 0.5 || measuredDuration > targetDuration * 2)
  const usedTargetDurationFallback = hasTargetDuration && isMeasuredDurationImplausible
  const billableDuration = usedTargetDurationFallback ? targetDuration : measuredDuration
  const musicDuration = measuredDuration > 0 ? measuredDuration : (hasTargetDuration ? targetDuration : 0)
  const processingTime = Date.now() - startTime
  const costPerMinute = getCostPerMinute(service, model)
  const totalCost = totalCostOverride ?? ((billableDuration / 60) * costPerMinute)

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
    actualCostUsd: totalCost,
    musicPreset: musicOptions.musicPreset,
    targetDurationSeconds: musicOptions.musicDurationSeconds,
    instrumental: musicOptions.musicInstrumental,
    sampleRate: musicOptions.musicSampleRate,
    bitrate: musicOptions.musicBitrate,
    musicS3Url
  }
}

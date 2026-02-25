import type { IProgressTracker, VideoGenServiceType } from '~/types'
import { err, l } from '~/utils/logging'
import { uploadToS3 } from '~/utils/s3-upload'
import { VIDEO_CONFIG } from '~/models/video-config'
import path from 'path'

export const STEP_NUMBER = 8
export const MAX_POLL_ATTEMPTS = 120
export const POLL_INTERVAL_MS = 5000

export const getCostPerSecond = (service: VideoGenServiceType, model: string): number => {
  const serviceConfig = VIDEO_CONFIG[service]
  if (!serviceConfig) return 0
  const modelConfig = serviceConfig.models.find(m => m.id === model)
  if (!modelConfig) return 0
  return modelConfig.costPerSecond || 0
}

export const requireVideoEnvKey = (keyName: string): string => {
  const apiKey = process.env[keyName]
  if (!apiKey) {
    throw new Error(`${keyName} environment variable is required`)
  }
  return apiKey
}

export const handleVideoError = (
  error: unknown,
  serviceName: string,
  progressTracker?: IProgressTracker,
  stepNumber: number = STEP_NUMBER
): never => {
  err(`${serviceName} video generation failed`, error)
  progressTracker?.error(stepNumber, 'Video generation failed', error instanceof Error ? error.message : 'Unknown error')
  throw error
}

export const buildVideoFileName = (videoType: string, extension: string = 'mp4'): string => {
  return `video_${videoType}.${extension}`
}

export const calculatePollingProgress = (
  attempt: number,
  maxAttempts: number,
  progressStart: number,
  progressEnd: number
): number => {
  const progress = Math.min(attempt / maxAttempts * 100, 99)
  return progressStart + Math.floor((progress / 100) * (progressEnd - progressStart))
}

export const saveVideoFile = async (
  buffer: Buffer | Uint8Array,
  outputDir: string,
  fileName: string,
  jobId?: string
): Promise<{ filePath: string, s3Url?: string }> => {
  const filePath = path.join(outputDir, fileName)
  await Bun.write(filePath, buffer)
  l('Video file saved', { fileName, size: `${(buffer.length / 1024 / 1024).toFixed(2)} MB` })

  let s3Url: string | undefined
  if (jobId) {
    const s3Result = await uploadToS3(filePath, jobId, 'video')
    s3Url = s3Result?.s3Url
  }

  return { filePath, ...(s3Url && { s3Url }) }
}

export const saveThumbnailFile = async (
  buffer: Buffer | Uint8Array,
  outputDir: string,
  fileName: string,
  jobId?: string
): Promise<{ filePath: string, thumbnailS3Url?: string }> => {
  const filePath = path.join(outputDir, fileName)
  await Bun.write(filePath, buffer)
  l('Thumbnail saved', { fileName, size: `${(buffer.length / 1024).toFixed(0)} KB` })

  let thumbnailS3Url: string | undefined
  if (jobId) {
    const s3Result = await uploadToS3(filePath, jobId, 'video')
    thumbnailS3Url = s3Result?.s3Url
  }

  return { filePath, ...(thumbnailS3Url && { thumbnailS3Url }) }
}

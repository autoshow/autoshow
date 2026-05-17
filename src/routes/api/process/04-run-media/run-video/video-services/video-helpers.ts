import path from 'path'
import type { IProgressTracker } from '~/types'
import { uploadToS3 } from '~/utils/s3-utils'

export const STEP_NUMBER = 8
export const MAX_POLL_ATTEMPTS = 120
export const POLL_INTERVAL_MS = 5000
export const requireVideoEnvKey = (keyName: string): string => {
  const apiKey = process.env[keyName]
  if (!apiKey) {
    throw new Error(`${keyName} environment variable is required`)
  }
  return apiKey
}

export const handleVideoError = (
  error: unknown,
  _serviceName: string,
  progressTracker?: IProgressTracker,
  stepNumber: number = STEP_NUMBER
): never => {
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

  let s3Url: string | undefined
  if (jobId) {
    const s3Result = await uploadToS3(filePath, jobId, 'video')
    s3Url = s3Result?.s3Url
  }

  return { filePath, ...(s3Url && { s3Url }) }
}

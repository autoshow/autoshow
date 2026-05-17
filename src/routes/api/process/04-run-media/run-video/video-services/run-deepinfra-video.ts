import type { SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunDeepinfraVideoDeepInfraVideoResponse as DeepInfraVideoResponse,GenerateVideoResult,IProgressTracker,VideoModel,VideoPromptType,VideoSize } from '~/types'
import { requireEnvKey } from '~/utils/env'
import { buildVideoFileName,handleVideoError,saveVideoFile } from './video-helpers'

const SERVICE_NAME = 'DeepInfra'
const DEEPINFRA_VIDEO_REQUEST_TIMEOUT_MS = 120_000
const DEEPINFRA_VIDEO_DOWNLOAD_TIMEOUT_MS = 30_000
const DEEPINFRA_FRAME_RATE = 8

const getDimensions = (size: VideoSize, aspectRatio?: string): { width: number, height: number } => {
  if (aspectRatio === '9:16' || size === '480x832' || size === '720x1280') {
    return { width: 480, height: 832 }
  }
  return { width: 832, height: 480 }
}

const getFrameCount = (duration: number): number => {
  return Math.max(16, Math.round(duration * DEEPINFRA_FRAME_RATE))
}

export const runDeepInfraVideo = async (
  prompt: string,
  model: VideoModel,
  size: VideoSize,
  duration: number,
  outputDir: string,
  videoType: VideoPromptType,
  progressTracker?: IProgressTracker,
  stepNumber?: number,
  _progressStart?: number,
  _progressEnd?: number,
  aspectRatio?: string,
  jobId?: string
): Promise<GenerateVideoResult & { s3Url?: string, actualCost?: number }> => {
  try {
    const apiKey = requireEnvKey('DEEPINFRA_API_KEY')
    const { width, height } = getDimensions(size, aspectRatio)

    progressTracker?.updateStepProgress(stepNumber ?? 8, 45, 'Submitting video render to DeepInfra')

    const response = await fetch(`https://api.deepinfra.com/v1/inference/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        width,
        height,
        num_frames: getFrameCount(duration),
        num_inference_steps: 20,
        guidance_scale: 5
      }),
      signal: AbortSignal.timeout(DEEPINFRA_VIDEO_REQUEST_TIMEOUT_MS)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepInfra video API error (${response.status}): ${errorText}`)
    }

    const data = await response.json() as DeepInfraVideoResponse
    if (!data.video_url) {
      throw new Error('No video URL in DeepInfra response')
    }

    progressTracker?.updateStepProgress(stepNumber ?? 8, 80, 'Downloading generated video')

    const videoResponse = await fetch(data.video_url, {
      signal: AbortSignal.timeout(DEEPINFRA_VIDEO_DOWNLOAD_TIMEOUT_MS)
    })
    if (!videoResponse.ok) {
      throw new Error(`DeepInfra video download failed: ${videoResponse.status}`)
    }

    const buffer = Buffer.from(await videoResponse.arrayBuffer())
    const fileName = buildVideoFileName(videoType)
    const { filePath: videoPath, s3Url } = await saveVideoFile(buffer, outputDir, fileName, jobId)

    return {
      videoPath,
      fileSize: buffer.length,
      ...(s3Url && { s3Url }),
      ...(data.inference_status?.cost != null && { actualCost: data.inference_status.cost })
    }
  } catch (error) {
    return handleVideoError(error, SERVICE_NAME, progressTracker, stepNumber)
  }
}

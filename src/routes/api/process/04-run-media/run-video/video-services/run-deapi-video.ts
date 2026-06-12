import type { GenerateVideoResult,IProgressTracker,VideoModel,VideoPromptType,VideoSize } from '~/types'
import { calculateDeapiPrice,createDeapiJob,downloadDeapiResult,pollDeapiJob } from '~/utils/deapi-jobs'
import { buildVideoFileName,handleVideoError,saveVideoFile } from './video-helpers'

const SERVICE_NAME = 'deAPI'
const DEAPI_VIDEO_FPS = 30
const DEAPI_VIDEO_STEPS = 1
const DEAPI_VIDEO_MAX_FRAMES = 120

const getDimensions = (size: VideoSize, aspectRatio?: string): { width: number, height: number } => {
  if (aspectRatio === '1:1' || size === '1024x1024') {
    return { width: 768, height: 768 }
  }

  if (aspectRatio === '9:16' || size === '720x1280') {
    return { width: 432, height: 768 }
  }

  return { width: 768, height: 432 }
}

export const runDeapiVideo = async (
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
    const { width, height } = getDimensions(size, aspectRatio)
    const requestBody = {
      prompt,
      width,
      height,
      guidance: 7.5,
      steps: DEAPI_VIDEO_STEPS,
      frames: Math.min(DEAPI_VIDEO_MAX_FRAMES, Math.max(DEAPI_VIDEO_FPS, duration * DEAPI_VIDEO_FPS)),
      seed: -1,
      model,
      negative_prompt: 'blur, darkness, noise',
      fps: DEAPI_VIDEO_FPS
    }

    progressTracker?.updateStepProgress(stepNumber ?? 8, 45, 'Submitting video render to deAPI')

    const actualCost = await calculateDeapiPrice('/api/v1/client/txt2video/price-calculation', requestBody, 'video generation')
    const requestId = await createDeapiJob('/api/v1/client/txt2video', requestBody, 'video generation')

    const status = await pollDeapiJob(requestId, 'video generation', progressTracker, {
      stepNumber: stepNumber ?? 8,
      progressStart: 50,
      progressEnd: 80,
      progressLabel: 'Rendering video with deAPI'
    })

    const resultUrl = status.data.result_url
    if (!resultUrl) {
      throw new Error('deAPI video generation completed without result URL')
    }

    const buffer = await downloadDeapiResult(resultUrl, 'video generation')
    const fileName = buildVideoFileName(videoType)
    const { filePath: videoPath, s3Url } = await saveVideoFile(buffer, outputDir, fileName, jobId)

    return {
      videoPath,
      fileSize: buffer.length,
      ...(s3Url && { s3Url }),
      ...(actualCost != null && { actualCost })
    }
  } catch (error) {
    return handleVideoError(error, SERVICE_NAME, progressTracker, stepNumber)
  }
}

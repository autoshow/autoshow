import { GoogleGenAI } from '@google/genai'
import type { VideoModel, VideoSize, VideoPromptType, GenerateVideoResult, IProgressTracker, VeoResolution, VeoAspectRatio, VeoOperation } from '~/types'
import { l } from '~/utils/logging'
import { wrapWithSafetyPrefix } from '~/prompts/video-prompts'
import {
  requireVideoEnvKey,
  handleVideoError,
  buildVideoFileName,
  calculatePollingProgress,
  MAX_POLL_ATTEMPTS,
  POLL_INTERVAL_MS
} from './video-helpers'

const SERVICE_NAME = 'Veo'

const mapToVeoResolution = (size: VideoSize): VeoResolution => {
  if (size === '720p' || size === '1080p' || size === '4k') {
    return size as VeoResolution
  }

  const sizeMap: Record<string, VeoResolution> = {
    '1920x1080': '1080p',
    '1080x1920': '1080p',
    '1280x720': '720p',
    '720x1280': '720p'
  }
  const mappedSize = sizeMap[size]
  if (!mappedSize) {
    l('Unknown size, defaulting to 720p', { size })
    return '720p'
  }
  return mappedSize
}

const getAspectRatioFromSize = (size: VideoSize): VeoAspectRatio => {
  if (size === '1080x1920' || size === '720x1280' || size === '9:16') {
    return '9:16'
  }
  return '16:9'
}

const validateResolutionDuration = (resolution: VeoResolution, duration: number): void => {
  if ((resolution === '1080p' || resolution === '4k') && duration !== 8) {
    throw new Error(`${resolution} resolution requires 8-second duration, got ${duration}s`)
  }
}

const createVeoVideoJob = async (
  client: GoogleGenAI,
  prompt: string,
  model: VideoModel,
  size: VideoSize,
  duration: number,
  aspectRatio?: string
): Promise<VeoOperation> => {
  l('Creating Veo video job', { model, size, duration: `${duration}s` })

  const safePrompt = wrapWithSafetyPrefix(prompt)
  l('Prompt wrapped with safety prefix', { length: `${safePrompt.length} chars` })

  const resolution = mapToVeoResolution(size)
  const veoAspectRatio = aspectRatio === '9:16' ? '9:16' : getAspectRatioFromSize(size)

  validateResolutionDuration(resolution, duration)

  l('Veo config', { resolution, aspectRatio: veoAspectRatio, duration })

  const operation = await client.models.generateVideos({
    model,
    prompt: safePrompt,
    config: {
      aspectRatio: veoAspectRatio,
      resolution,
      durationSeconds: duration as 4 | 6 | 8
    }
  })

  l('Video job created', { name: operation.name, done: operation.done })

  return operation as unknown as VeoOperation
}

const pollVeoVideoStatus = async (
  client: GoogleGenAI,
  operation: VeoOperation,
  progressTracker?: IProgressTracker,
  stepNumber?: number,
  progressStart?: number,
  progressEnd?: number
): Promise<VeoOperation> => {
  l('Polling Veo video status', { operationName: operation.name })

  let currentOp: VeoOperation = operation

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (currentOp.done) {
      break
    }

    await Bun.sleep(POLL_INTERVAL_MS)

    const polledOp = await client.operations.getVideosOperation({
      operation: currentOp as Parameters<typeof client.operations.getVideosOperation>[0]['operation']
    })
    currentOp = polledOp as unknown as VeoOperation

    if (progressTracker && stepNumber !== undefined && progressStart !== undefined && progressEnd !== undefined) {
      const scaledProgress = calculatePollingProgress(attempt, MAX_POLL_ATTEMPTS, progressStart, progressEnd)
      progressTracker.updateStepProgress(
        stepNumber,
        scaledProgress,
        `Rendering video: ${Math.min(attempt / MAX_POLL_ATTEMPTS * 100, 99).toFixed(0)}%`
      )
    }

    if (currentOp.done) {
      l('Veo video job completed', { operationName: operation.name })
      return currentOp
    }

    if (currentOp.error) {
      const errorMessage = currentOp.error.message || 'Video generation failed'
      throw new Error(errorMessage)
    }

    if (attempt % 6 === 0) {
      l('Veo video status', { attempt, maxAttempts: MAX_POLL_ATTEMPTS })
    }
  }

  if (!currentOp.done) {
    throw new Error('Veo video generation timed out after 10 minutes')
  }

  return currentOp
}

const downloadVeoVideo = async (
  client: GoogleGenAI,
  operation: VeoOperation,
  outputPath: string
): Promise<{ path: string; size: number }> => {
  const generatedVideo = operation.response?.generatedVideos?.[0]
  if (!generatedVideo?.video) {
    throw new Error('No video in Veo operation response')
  }

  const videoFile = generatedVideo.video

  l('Downloading Veo video', { uri: videoFile.uri })

  await client.files.download({
    file: videoFile as Parameters<typeof client.files.download>[0]['file'],
    downloadPath: outputPath
  })

  const file = Bun.file(outputPath)
  const size = file.size

  l('Downloaded Veo video', {
    path: outputPath,
    size: `${(size / 1024 / 1024).toFixed(2)} MB`
  })

  return { path: outputPath, size }
}

export const runGeminiVideo = async (
  prompt: string,
  model: VideoModel,
  size: VideoSize,
  duration: number,
  outputDir: string,
  videoType: VideoPromptType,
  progressTracker?: IProgressTracker,
  stepNumber?: number,
  progressStart?: number,
  progressEnd?: number,
  aspectRatio?: string,
  jobId?: string
): Promise<GenerateVideoResult & { s3Url?: string }> => {
  try {
    const apiKey = requireVideoEnvKey('GEMINI_API_KEY')
    const client = new GoogleGenAI({ apiKey })

    l(`Starting ${SERVICE_NAME} video generation`, { videoType, model })

    const operation = await createVeoVideoJob(client, prompt, model, size, duration, aspectRatio)

    const completedOp = await pollVeoVideoStatus(
      client,
      operation,
      progressTracker,
      stepNumber,
      progressStart,
      progressEnd
    )

    if (completedOp.error) {
      throw new Error(completedOp.error.message || 'Video generation failed')
    }

    const videoFileName = buildVideoFileName(videoType)
    const videoPath = `${outputDir}/${videoFileName}`
    const { size: fileSize } = await downloadVeoVideo(client, completedOp, videoPath)

    let s3Url: string | undefined
    if (jobId) {
      const { uploadToS3 } = await import('~/utils/s3-upload')
      const s3Result = await uploadToS3(videoPath, jobId, 'video')
      s3Url = s3Result?.s3Url
    }

    return {
      videoPath,
      fileSize,
      ...(s3Url && { s3Url })
    }
  } catch (error) {
    return handleVideoError(error, SERVICE_NAME, progressTracker, stepNumber)
  }
}

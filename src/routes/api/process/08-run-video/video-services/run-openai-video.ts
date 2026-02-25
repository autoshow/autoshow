import OpenAI from 'openai'
import type { VideoModel, VideoSize, VideoPromptType, GenerateVideoResult, IProgressTracker, SoraSize } from '~/types'
import { l } from '~/utils/logging'
import { wrapWithSafetyPrefix } from '~/prompts/video-prompts'
import {
  requireVideoEnvKey,
  handleVideoError,
  buildVideoFileName,
  MAX_POLL_ATTEMPTS,
  POLL_INTERVAL_MS
} from './video-helpers'

const SERVICE_NAME = 'Sora'

const mapToSoraSize = (size: VideoSize): SoraSize => {
  const sizeMap: Record<string, SoraSize> = {
    '1920x1080': '1792x1024',
    '1080x1920': '1024x1792',
    '1280x720': '1280x720',
    '720x1280': '720x1280'
  }
  const mappedSize = sizeMap[size]
  if (!mappedSize) {
    throw new Error(`Unsupported video size: ${size}`)
  }
  return mappedSize
}

const createSoraVideoJob = async (
  client: OpenAI,
  prompt: string,
  model: VideoModel,
  size: VideoSize,
  duration: number
): Promise<string> => {
  l('Creating Sora video job', { model, size, duration: `${duration}s` })

  const safePrompt = wrapWithSafetyPrefix(prompt)
  l('Prompt wrapped with safety prefix', { length: `${safePrompt.length} chars` })

  const soraSize = mapToSoraSize(size)
  l('Mapped size to Sora size', { inputSize: size, soraSize })

  const job = await client.videos.create({
    model,
    prompt: safePrompt,
    size: soraSize,
    seconds: String(duration) as '4' | '8' | '12'
  })

  l('Video job created', { id: job.id, status: job.status })

  return job.id
}

const pollSoraVideoStatus = async (
  client: OpenAI,
  videoId: string,
  progressTracker?: IProgressTracker,
  stepNumber?: number,
  progressStart?: number,
  progressEnd?: number
): Promise<void> => {
  l('Polling video status', { videoId })

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const data = await client.videos.retrieve(videoId)

    if (progressTracker && stepNumber !== undefined && progressStart !== undefined && progressEnd !== undefined) {
      const apiProgress = data.progress ?? 0
      const scaledProgress = progressStart + Math.floor((apiProgress / 100) * (progressEnd - progressStart))
      progressTracker.updateStepProgress(
        stepNumber,
        scaledProgress,
        `Rendering video: ${apiProgress}%`
      )
    }

    if (data.status === 'completed') {
      l('Video job completed', { videoId })
      return
    }

    if (data.status === 'failed') {
      const errorMessage = data.error?.message || 'Video generation failed'
      throw new Error(errorMessage)
    }

    if (attempt % 6 === 0) {
      l('Video status', { status: data.status, progress: `${data.progress ?? 0}%` })
    }

    await Bun.sleep(POLL_INTERVAL_MS)
  }

  throw new Error('Video generation timed out after 10 minutes')
}

const downloadSoraContent = async (
  client: OpenAI,
  videoId: string,
  outputPath: string,
  variant: 'video' | 'thumbnail' = 'video'
): Promise<{ path: string; size: number }> => {
  l('Downloading content', { variant, videoId })

  const response = variant === 'video'
    ? await client.videos.downloadContent(videoId)
    : await client.videos.downloadContent(videoId, { variant: 'thumbnail' })

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  await Bun.write(outputPath, buffer)

  l('Downloaded content', {
    variant,
    path: outputPath,
    size: `${(buffer.length / 1024 / 1024).toFixed(2)} MB`
  })

  return { path: outputPath, size: buffer.length }
}

export const runOpenAIVideo = async (
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
  _aspectRatio?: string,
  jobId?: string
): Promise<GenerateVideoResult & { s3Url?: string, thumbnailS3Url?: string }> => {
  try {
    const apiKey = requireVideoEnvKey('OPENAI_API_KEY')
    const client = new OpenAI({ apiKey })

    l(`Starting ${SERVICE_NAME} video generation`, { videoType })

    const videoId = await createSoraVideoJob(client, prompt, model, size, duration)

    await pollSoraVideoStatus(
      client,
      videoId,
      progressTracker,
      stepNumber,
      progressStart,
      progressEnd
    )

    const videoFileName = buildVideoFileName(videoType)
    const tempVideoPath = `${outputDir}/${videoFileName}`
    const { size: fileSize } = await downloadSoraContent(client, videoId, tempVideoPath, 'video')

    let s3Url: string | undefined
    if (jobId) {
      const { uploadToS3 } = await import('~/utils/s3-upload')
      const s3Result = await uploadToS3(tempVideoPath, jobId, 'video')
      s3Url = s3Result?.s3Url
    }

    let thumbnailPath: string | undefined
    let thumbnailS3Url: string | undefined
    try {
      const thumbnailFileName = buildVideoFileName(videoType, 'webp').replace('.webp', '_thumb.webp')
      thumbnailPath = `${outputDir}/${thumbnailFileName}`
      await downloadSoraContent(client, videoId, thumbnailPath, 'thumbnail')

      if (jobId) {
        const { uploadToS3 } = await import('~/utils/s3-upload')
        const s3Result = await uploadToS3(thumbnailPath, jobId, 'video')
        thumbnailS3Url = s3Result?.s3Url
      }
    } catch (thumbnailError) {
      l('Failed to download thumbnail', {
        error: thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error'
      })
      thumbnailPath = undefined
    }

    return {
      videoPath: tempVideoPath,
      fileSize,
      ...(thumbnailPath && { thumbnailPath }),
      ...(s3Url && { s3Url }),
      ...(thumbnailS3Url && { thumbnailS3Url })
    }
  } catch (error) {
    return handleVideoError(error, SERVICE_NAME, progressTracker, stepNumber)
  }
}

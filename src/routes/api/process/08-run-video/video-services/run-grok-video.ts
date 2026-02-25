import type { VideoModel, VideoSize, VideoPromptType, GenerateVideoResult, IProgressTracker, GrokResolution, GrokAspectRatio } from '~/types'
import { l, err } from '~/utils/logging'
import { wrapWithSafetyPrefix } from '~/prompts/video-prompts'
import {
  requireVideoEnvKey,
  buildVideoFileName,
  calculatePollingProgress,
  MAX_POLL_ATTEMPTS,
  POLL_INTERVAL_MS
} from './video-helpers'

const SERVICE_NAME = 'Grok'
const CREATE_URL = 'https://api.x.ai/v1/videos/generations'
const STATUS_URL = 'https://api.x.ai/v1/videos'

type GrokVideoResponse = {
  request_id?: string
  response_id?: string
  error?: {
    message?: string
    type?: string
  }
}

type GrokVideoStatusResponse = {
  status?: 'pending' | 'completed' | 'failed'
  video?: {
    url?: string
    duration?: number
    respect_moderation?: boolean
  }
  model?: string
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

const mapToGrokResolution = (size: VideoSize): GrokResolution => {
  if (size === '720p' || size === '480p') {
    return size as GrokResolution
  }

  const sizeMap: Record<string, GrokResolution> = {
    '1920x1080': '720p',
    '1080x1920': '720p',
    '1280x720': '720p',
    '720x1280': '720p',
    '1080p': '720p',
    '854x480': '480p',
    '480x854': '480p'
  }

  const mappedSize = sizeMap[size]
  if (mappedSize) return mappedSize

  l('Unknown size, defaulting to 720p', { size })
  return '720p'
}

const mapToGrokAspectRatio = (aspectRatio?: string): GrokAspectRatio | undefined => {
  if (!aspectRatio) return undefined

  const validRatios: GrokAspectRatio[] = ['16:9', '4:3', '1:1', '9:16', '3:4', '3:2', '2:3']
  if (validRatios.includes(aspectRatio as GrokAspectRatio)) {
    return aspectRatio as GrokAspectRatio
  }

  l('Invalid aspect ratio, using default', { aspectRatio })
  return undefined
}

const createGrokVideoJob = async (
  apiKey: string,
  prompt: string,
  model: VideoModel,
  resolution: GrokResolution,
  duration: number,
  aspectRatio?: GrokAspectRatio
): Promise<string> => {
  l('Creating Grok video job', { model, resolution, duration: `${duration}s`, aspectRatio })

  const safePrompt = wrapWithSafetyPrefix(prompt)
  l('Prompt wrapped with safety prefix', { length: `${safePrompt.length} chars` })

  const body: Record<string, unknown> = {
    prompt: safePrompt,
    model
  }

  if (duration > 0) {
    body.duration = duration
  }

  if (aspectRatio) {
    body.aspect_ratio = aspectRatio
  }

  if (resolution) {
    body.resolution = resolution
  }

  const response = await fetch(CREATE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Grok video creation failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json() as GrokVideoResponse

  l('Create video response', { fullResponse: JSON.stringify(data, null, 2) })

  if (data.error) {
    throw new Error(`Grok API error: ${data.error.message || 'Unknown error'}`)
  }

  const requestId = data.request_id || data.response_id
  if (!requestId) {
    throw new Error('No request_id or response_id in Grok response')
  }

  l('Video job created', { requestId })
  return requestId
}

const pollGrokVideoStatus = async (
  apiKey: string,
  requestId: string,
  progressTracker?: IProgressTracker,
  stepNumber?: number,
  progressStart?: number,
  progressEnd?: number
): Promise<string> => {
  l('Polling Grok video status', { requestId })

  await Bun.sleep(2000)

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(`${STATUS_URL}/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      l('Grok status query error', { 
        status: response.status, 
        requestId, 
        error: errorText,
        url: `${STATUS_URL}/${requestId}`
      })
      throw new Error(`Grok status query failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as GrokVideoStatusResponse

    if (attempt === 0) {
      l('First poll response structure', { data: JSON.stringify(data, null, 2) })
    }

    if (data.error) {
      throw new Error(`Grok query error: ${data.error.message || 'Unknown error'}`)
    }

    if (progressTracker && stepNumber !== undefined && progressStart !== undefined && progressEnd !== undefined) {
      const scaledProgress = calculatePollingProgress(attempt, MAX_POLL_ATTEMPTS, progressStart, progressEnd)
      progressTracker.updateStepProgress(
        stepNumber,
        scaledProgress,
        `Rendering video: ${Math.min(attempt / MAX_POLL_ATTEMPTS * 100, 99).toFixed(0)}%`
      )
    }

    if (data.video?.url) {
      l('Grok video job completed', { requestId, videoUrl: data.video.url.slice(0, 50) + '...' })
      return data.video.url
    }

    if (data.status === 'failed' || data.error) {
      throw new Error('Grok video generation failed')
    }

    if (data.status !== 'pending') {
      l('Unexpected status, continuing to poll', { status: data.status, data: JSON.stringify(data) })
    }

    if (attempt % 6 === 0) {
      l('Grok video status', { attempt, maxAttempts: MAX_POLL_ATTEMPTS, status: data.status, fullResponse: JSON.stringify(data) })
    }

    await Bun.sleep(POLL_INTERVAL_MS)
  }

  throw new Error('Grok video generation timed out after 10 minutes')
}

const downloadGrokVideo = async (
  videoUrl: string,
  outputPath: string
): Promise<{ path: string; size: number }> => {
  l('Downloading Grok video', { videoUrl: videoUrl.slice(0, 50) + '...' })

  const videoResponse = await fetch(videoUrl)
  if (!videoResponse.ok) {
    throw new Error(`Video download failed: ${videoResponse.status}`)
  }

  const videoBuffer = await videoResponse.arrayBuffer()
  await Bun.write(outputPath, new Uint8Array(videoBuffer))

  const file = Bun.file(outputPath)
  const size = file.size

  l('Downloaded Grok video', {
    path: outputPath,
    size: `${(size / 1024 / 1024).toFixed(2)} MB`
  })

  return { path: outputPath, size }
}

export const runGrokVideo = async (
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
    const apiKey = requireVideoEnvKey('XAI_API_KEY')

    l(`Starting ${SERVICE_NAME} video generation`, { videoType, model })

    const resolution = mapToGrokResolution(size)
    const grokAspectRatio = mapToGrokAspectRatio(aspectRatio)

    const requestId = await createGrokVideoJob(apiKey, prompt, model, resolution, duration, grokAspectRatio)

    const videoUrl = await pollGrokVideoStatus(
      apiKey,
      requestId,
      progressTracker,
      stepNumber,
      progressStart,
      progressEnd
    )

    const videoFileName = buildVideoFileName(videoType)
    const videoPath = `${outputDir}/${videoFileName}`
    const { size: fileSize } = await downloadGrokVideo(videoUrl, videoPath)

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
    err(`${SERVICE_NAME} video generation failed`, error)
    progressTracker?.error(stepNumber || 8, 'Video generation failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

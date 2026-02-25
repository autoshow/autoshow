import type { VideoModel, VideoSize, VideoPromptType, GenerateVideoResult, IProgressTracker } from '~/types'
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

const SERVICE_NAME = 'MiniMax'
const CREATE_URL = 'https://api.minimax.io/v1/video_generation'
const QUERY_URL = 'https://api.minimax.io/v1/query/video_generation'
const FILES_URL = 'https://api.minimax.io/v1/files/retrieve'

type MinimaxResolution = '768P' | '1080P' | '720P'

type MinimaxVideoResponse = {
  task_id?: string
  base_resp?: { status_code?: number; status_msg?: string }
}

type MinimaxQueryResponse = {
  status?: string
  file_id?: string
  base_resp?: { status_code?: number; status_msg?: string }
}

type MinimaxFileResponse = {
  file?: { download_url?: string }
  base_resp?: { status_code?: number; status_msg?: string }
}

const mapToMinimaxResolution = (size: VideoSize, model: VideoModel): MinimaxResolution => {
  if (size === '768P' || size === '1080P' || size === '720P') {
    return size as MinimaxResolution
  }

  const isHailuoModel = model.includes('Hailuo')

  const sizeMap: Record<string, MinimaxResolution> = {
    '1920x1080': '1080P',
    '1080x1920': '1080P',
    '1280x720': isHailuoModel ? '768P' : '720P',
    '720x1280': isHailuoModel ? '768P' : '720P',
    '720p': isHailuoModel ? '768P' : '720P',
    '1080p': '1080P'
  }

  const mappedSize = sizeMap[size]
  if (mappedSize) return mappedSize

  l('Unknown size, defaulting based on model', { size, model })
  return isHailuoModel ? '768P' : '720P'
}

const validateResolutionDuration = (resolution: MinimaxResolution, duration: number, model: VideoModel): void => {
  const isHailuoModel = model.includes('Hailuo')

  if (resolution === '1080P' && duration !== 6) {
    throw new Error(`1080P resolution requires 6-second duration, got ${duration}s`)
  }

  if (!isHailuoModel && duration !== 6) {
    throw new Error(`T2V models only support 6-second duration, got ${duration}s`)
  }

  if (isHailuoModel && duration !== 6 && duration !== 10) {
    throw new Error(`Hailuo models support 6s or 10s duration, got ${duration}s`)
  }
}

const createMinimaxVideoJob = async (
  apiKey: string,
  prompt: string,
  model: VideoModel,
  resolution: MinimaxResolution,
  duration: number
): Promise<string> => {
  l('Creating MiniMax video job', { model, resolution, duration: `${duration}s` })

  const safePrompt = wrapWithSafetyPrefix(prompt)
  l('Prompt wrapped with safety prefix', { length: `${safePrompt.length} chars` })

  const isHailuoModel = model.includes('Hailuo')

  const body: Record<string, unknown> = {
    model,
    prompt: safePrompt,
    prompt_optimizer: true,
    duration,
    resolution
  }

  if (isHailuoModel) {
    body.fast_pretreatment = true
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
    throw new Error(`MiniMax video creation failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json() as MinimaxVideoResponse

  if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
    throw new Error(`MiniMax API error: ${data.base_resp.status_msg || 'Unknown error'}`)
  }

  if (!data.task_id) {
    throw new Error('No task_id in MiniMax response')
  }

  l('Video job created', { taskId: data.task_id })
  return data.task_id
}

const pollMinimaxVideoStatus = async (
  apiKey: string,
  taskId: string,
  progressTracker?: IProgressTracker,
  stepNumber?: number,
  progressStart?: number,
  progressEnd?: number
): Promise<string> => {
  l('Polling MiniMax video status', { taskId })

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(`${QUERY_URL}?task_id=${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`MiniMax query failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as MinimaxQueryResponse

    if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
      throw new Error(`MiniMax query error: ${data.base_resp.status_msg || 'Unknown error'}`)
    }

    if (progressTracker && stepNumber !== undefined && progressStart !== undefined && progressEnd !== undefined) {
      const scaledProgress = calculatePollingProgress(attempt, MAX_POLL_ATTEMPTS, progressStart, progressEnd)
      progressTracker.updateStepProgress(
        stepNumber,
        scaledProgress,
        `Rendering video: ${Math.min(attempt / MAX_POLL_ATTEMPTS * 100, 99).toFixed(0)}%`
      )
    }

    if (data.status === 'Success' || data.status === 'Finished') {
      if (!data.file_id) {
        throw new Error('Video completed but no file_id returned')
      }
      l('MiniMax video job completed', { taskId, fileId: data.file_id })
      return data.file_id
    }

    if (data.status === 'Failed' || data.status === 'Error') {
      throw new Error('MiniMax video generation failed')
    }

    if (attempt % 6 === 0) {
      l('MiniMax video status', { attempt, maxAttempts: MAX_POLL_ATTEMPTS, status: data.status })
    }

    await Bun.sleep(POLL_INTERVAL_MS)
  }

  throw new Error('MiniMax video generation timed out after 10 minutes')
}

const downloadMinimaxVideo = async (
  apiKey: string,
  fileId: string,
  outputPath: string
): Promise<{ path: string; size: number }> => {
  l('Retrieving MiniMax video download URL', { fileId })

  const response = await fetch(`${FILES_URL}?file_id=${fileId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`MiniMax file retrieve failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json() as MinimaxFileResponse

  if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
    throw new Error(`MiniMax file retrieve error: ${data.base_resp.status_msg || 'Unknown error'}`)
  }

  const downloadUrl = data.file?.download_url
  if (!downloadUrl) {
    throw new Error('No download URL in MiniMax response')
  }

  l('Downloading MiniMax video', { downloadUrl: downloadUrl.slice(0, 50) + '...' })

  const videoResponse = await fetch(downloadUrl)
  if (!videoResponse.ok) {
    throw new Error(`Video download failed: ${videoResponse.status}`)
  }

  const videoBuffer = await videoResponse.arrayBuffer()
  await Bun.write(outputPath, new Uint8Array(videoBuffer))

  const file = Bun.file(outputPath)
  const size = file.size

  l('Downloaded MiniMax video', {
    path: outputPath,
    size: `${(size / 1024 / 1024).toFixed(2)} MB`
  })

  return { path: outputPath, size }
}

export const runMinimaxVideo = async (
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
): Promise<GenerateVideoResult & { s3Url?: string }> => {
  try {
    const apiKey = requireVideoEnvKey('MINIMAX_API_KEY')

    l(`Starting ${SERVICE_NAME} video generation`, { videoType, model })

    const resolution = mapToMinimaxResolution(size, model)
    validateResolutionDuration(resolution, duration, model)

    const taskId = await createMinimaxVideoJob(apiKey, prompt, model, resolution, duration)

    const fileId = await pollMinimaxVideoStatus(
      apiKey,
      taskId,
      progressTracker,
      stepNumber,
      progressStart,
      progressEnd
    )

    const videoFileName = buildVideoFileName(videoType)
    const videoPath = `${outputDir}/${videoFileName}`
    const { size: fileSize } = await downloadMinimaxVideo(apiKey, fileId, videoPath)

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

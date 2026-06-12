import { wrapWithSafetyPrefix } from '~/prompts/video-prompts'
import type { GenerateVideoResult,SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunGlmVideoGlmApiError as GlmApiError,SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunGlmVideoGlmPollResponse as GlmPollResponse,SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunGlmVideoGlmVideoResponse as GlmVideoResponse,IProgressTracker,VideoModel,VideoPromptType,VideoSize } from '~/types'
import {
buildVideoFileName,
calculatePollingProgress,
handleVideoError,
MAX_POLL_ATTEMPTS,
POLL_INTERVAL_MS,
requireVideoEnvKey,
saveVideoFile
} from './video-helpers'

const SERVICE_NAME = 'GLM'
const BASE_URL = 'https://api.z.ai/api/paas/v4'
const CREATE_URL = `${BASE_URL}/videos/generations`
const POLL_URL = `${BASE_URL}/async-result`

const GLM_REQUEST_TIMEOUT_MS = 30_000
const GLM_DOWNLOAD_RETRY_ATTEMPTS = 3
const GLM_DOWNLOAD_RETRY_DELAY_MS = 2_000
const GLM_RETRYABLE_POLL_STATUSES = new Set([408, 429, 500, 502, 503, 504])

const buildCogVideoXBody = (prompt: string, model: string, size: string): Record<string, unknown> => ({
  model,
  prompt,
  quality: 'quality',
  size,
  fps: 30,
  with_audio: true
})

const buildViduQ1Body = (prompt: string, model: string, _size: string): Record<string, unknown> => ({
  model,
  prompt,
  duration: 5,
  style: 'general',
  aspect_ratio: '16:9',
  movement_amplitude: 'auto'
})

const mapToGlmSize = (size: VideoSize): string => {
  const sizeMap: Record<string, string> = {
    '1920x1080': '1920x1080',
    '1080x1920': '1080x1920',
    '1280x720': '1280x720',
    '720x1280': '1280x720'
  }
  return sizeMap[size] || '1920x1080'
}

const isRetryableTimeoutError = (error: unknown): boolean => {
  return error instanceof Error && (
    error.name === 'TimeoutError'
    || error.name === 'AbortError'
    || /timed out/i.test(error.message)
  )
}

const createGlmApiError = (message: string, status?: number): GlmApiError => {
  const error = new Error(message) as GlmApiError
  if (status !== undefined) {
    error.status = status
  }
  return error
}

const isRetryableGlmPollError = (error: unknown): boolean => {
  if (isRetryableTimeoutError(error)) {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  const maybeApiError = error as GlmApiError
  return maybeApiError.status !== undefined && GLM_RETRYABLE_POLL_STATUSES.has(maybeApiError.status)
}

const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(GLM_REQUEST_TIMEOUT_MS)
  })
}

const fetchGlmPollResponse = async (apiKey: string, taskId: string): Promise<GlmPollResponse> => {
  const response = await fetchWithTimeout(`${POLL_URL}/${taskId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw createGlmApiError(`GLM poll failed: ${response.status} - ${errorText}`, response.status)
  }

  return await response.json() as GlmPollResponse
}

const getGlmVideoUrl = (data: GlmPollResponse, context: 'completion' | 'refresh'): string => {
  if (data.task_status === 'FAIL' || data.task_status === 'FAILED') {
    throw new Error('GLM video generation failed')
  }

  const videoUrl = data.video_result?.[0]?.url
  if (!videoUrl) {
    const suffix = data.task_status ? ` (task status: ${data.task_status})` : ''
    const message = context === 'completion'
      ? 'Video completed but no URL returned'
      : `GLM video result refresh returned no downloadable URL${suffix}`
    throw new Error(message)
  }

  return videoUrl
}

const createGlmVideoJob = async (
  apiKey: string,
  prompt: string,
  model: VideoModel,
  size: string
): Promise<string> => {

  const safePrompt = model === 'cogvideox-3'
    ? wrapWithSafetyPrefix(prompt, { mode: 'compact' })
    : wrapWithSafetyPrefix(prompt)

  const body = model === 'viduq1-text'
    ? buildViduQ1Body(safePrompt, model, size)
    : buildCogVideoXBody(safePrompt, model, size)

  const response = await fetchWithTimeout(CREATE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GLM video creation failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json() as GlmVideoResponse

  const taskId = data.id || data.task_id || data.request_id
  if (!taskId) {
    throw new Error('No task ID in GLM response')
  }

  return taskId
}

const pollGlmVideoStatus = async (
  apiKey: string,
  taskId: string,
  progressTracker?: IProgressTracker,
  stepNumber?: number,
  progressStart?: number,
  progressEnd?: number
): Promise<string> => {

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    let data: GlmPollResponse
    try {
      data = await fetchGlmPollResponse(apiKey, taskId)
    } catch (error) {
      if (isRetryableGlmPollError(error)) {
        await Bun.sleep(POLL_INTERVAL_MS)
        continue
      }
      throw error
    }

    if (progressTracker && stepNumber !== undefined && progressStart !== undefined && progressEnd !== undefined) {
      const scaledProgress = calculatePollingProgress(attempt, MAX_POLL_ATTEMPTS, progressStart, progressEnd)
      progressTracker.updateStepProgress(
        stepNumber,
        scaledProgress,
        `Rendering video: ${Math.min(attempt / MAX_POLL_ATTEMPTS * 100, 99).toFixed(0)}%`
      )
    }

    if (data.task_status === 'SUCCESS' || data.task_status === 'COMPLETED') {
      return getGlmVideoUrl(data, 'completion')
    }

    if (data.task_status === 'FAIL' || data.task_status === 'FAILED') {
      throw new Error('GLM video generation failed')
    }

    if (attempt % 6 === 0) {
    }

    await Bun.sleep(POLL_INTERVAL_MS)
  }

  throw new Error('GLM video generation timed out after 10 minutes')
}

const downloadGlmVideoResult = async (
  apiKey: string,
  taskId: string,
  initialVideoUrl: string
): Promise<Buffer> => {
  let videoUrl = initialVideoUrl

  for (let attempt = 0; attempt <= GLM_DOWNLOAD_RETRY_ATTEMPTS; attempt++) {
    try {
      const videoResponse = await fetchWithTimeout(videoUrl)
      if (videoResponse.ok) {
        return Buffer.from(await videoResponse.arrayBuffer())
      }

      if (videoResponse.status !== 404 || attempt === GLM_DOWNLOAD_RETRY_ATTEMPTS) {
        throw new Error(`Video download failed: ${videoResponse.status}`)
      }
    } catch (error) {
      if (!isRetryableTimeoutError(error) || attempt === GLM_DOWNLOAD_RETRY_ATTEMPTS) {
        throw error
      }
    }

    await Bun.sleep(GLM_DOWNLOAD_RETRY_DELAY_MS)
    const refreshedResult = await fetchGlmPollResponse(apiKey, taskId)
    videoUrl = getGlmVideoUrl(refreshedResult, 'refresh')
  }

  throw new Error('Video download failed after retries')
}

export const runGlmVideo = async (
  prompt: string,
  model: VideoModel,
  size: VideoSize,
  _duration: number,
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
    const apiKey = requireVideoEnvKey('GLM_API_KEY')

    const glmSize = mapToGlmSize(size)

    const taskId = await createGlmVideoJob(apiKey, prompt, model, glmSize)

    const videoUrl = await pollGlmVideoStatus(
      apiKey,
      taskId,
      progressTracker,
      stepNumber,
      progressStart,
      progressEnd
    )

    const videoBuffer = await downloadGlmVideoResult(apiKey, taskId, videoUrl)
    const videoFileName = buildVideoFileName(videoType)
    const { filePath, s3Url } = await saveVideoFile(videoBuffer, outputDir, videoFileName, jobId)

    return {
      videoPath: filePath,
      fileSize: videoBuffer.length,
      ...(s3Url && { s3Url })
    }
  } catch (error) {
    return handleVideoError(error, SERVICE_NAME, progressTracker, stepNumber)
  }
}

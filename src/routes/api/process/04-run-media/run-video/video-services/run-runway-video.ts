import { wrapWithSafetyPrefix } from '~/prompts/video-prompts'
import type { GenerateVideoResult,IProgressTracker,RunwayTaskResponse,VideoModel,VideoPromptType,VideoSize } from '~/types'
import {
buildVideoFileName,
calculatePollingProgress,
handleVideoError,
MAX_POLL_ATTEMPTS,
POLL_INTERVAL_MS,
requireVideoEnvKey
} from './video-helpers'

const SERVICE_NAME = 'Runway'
const BASE_URL = 'https://api.dev.runwayml.com'
const RUNWAY_VERSION = '2024-11-06'
const PROMPT_LIMIT = 1000

const mapToRunwayRatio = (size: VideoSize): string => {
  const ratioMap: Record<string, string> = {
    '1920x1080': '1920:1080',
    '1080x1920': '1080:1920',
    '1280x720': '1280:720',
    '720x1280': '720:1280',
    '1920:1080': '1920:1080',
    '1080:1920': '1080:1920',
    '1280:720': '1280:720',
    '720:1280': '720:1280',
    '1080p': '1920:1080',
    '720p': '1280:720'
  }

  const mapped = ratioMap[size]
  if (!mapped) {
    throw new Error(`Unsupported Runway video size: ${size}`)
  }
  return mapped
}

const trimPromptToLimit = (prompt: string): string => {
  if (prompt.length <= PROMPT_LIMIT) return prompt
  const trimmed = prompt.slice(0, PROMPT_LIMIT)
  return trimmed
}

const createRunwayVideoTask = async (
  apiKey: string,
  prompt: string,
  model: VideoModel,
  size: VideoSize,
  duration: number
): Promise<string> => {

  const safePrompt = wrapWithSafetyPrefix(prompt)
  const promptText = trimPromptToLimit(safePrompt)
  const ratio = mapToRunwayRatio(size)

  const response = await fetch(`${BASE_URL}/v1/text_to_video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-Runway-Version': RUNWAY_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      promptText,
      ratio,
      duration,
      model
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Runway video creation failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json() as { id?: string }
  if (!data.id) {
    throw new Error('No task id in Runway response')
  }

  return data.id
}

const pollRunwayTaskStatus = async (
  apiKey: string,
  taskId: string,
  progressTracker?: IProgressTracker,
  stepNumber?: number,
  progressStart?: number,
  progressEnd?: number
): Promise<RunwayTaskResponse> => {

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(`${BASE_URL}/v1/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': RUNWAY_VERSION
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Runway task query failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as RunwayTaskResponse

    if (progressTracker && stepNumber !== undefined && progressStart !== undefined && progressEnd !== undefined) {
      const scaledProgress = calculatePollingProgress(attempt, MAX_POLL_ATTEMPTS, progressStart, progressEnd)
      progressTracker.updateStepProgress(
        stepNumber,
        scaledProgress,
        `Rendering video: ${Math.min(attempt / MAX_POLL_ATTEMPTS * 100, 99).toFixed(0)}%`
      )
    }

    if (data.status === 'SUCCEEDED') {
      return data
    }

    if (data.status === 'FAILED' || data.status === 'CANCELED' || data.status === 'CANCELLED') {
      const errorMessage = data.error?.message || `Runway task failed with status: ${data.status}`
      throw new Error(errorMessage)
    }

    if (attempt % 6 === 0) {
    }

    await Bun.sleep(POLL_INTERVAL_MS)
  }

  throw new Error('Runway video generation timed out after 10 minutes')
}

const downloadRunwayVideo = async (
  videoUrl: string,
  outputPath: string
): Promise<{ path: string; size: number }> => {

  const videoResponse = await fetch(videoUrl)
  if (!videoResponse.ok) {
    throw new Error(`Video download failed: ${videoResponse.status}`)
  }

  const videoBuffer = await videoResponse.arrayBuffer()
  await Bun.write(outputPath, new Uint8Array(videoBuffer))

  const file = Bun.file(outputPath)
  const size = file.size

  return { path: outputPath, size }
}

export const runRunwayVideo = async (
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
    const apiKey = requireVideoEnvKey('RUNWAYML_API_SECRET')

    const taskId = await createRunwayVideoTask(apiKey, prompt, model, size, duration)

    const completedTask = await pollRunwayTaskStatus(
      apiKey,
      taskId,
      progressTracker,
      stepNumber,
      progressStart,
      progressEnd
    )

    const outputUrl = completedTask.output?.[0]
    if (!outputUrl) {
      throw new Error('Runway task completed without output URL')
    }

    const videoFileName = buildVideoFileName(videoType)
    const videoPath = `${outputDir}/${videoFileName}`
    const { size: fileSize } = await downloadRunwayVideo(outputUrl, videoPath)

    let s3Url: string | undefined
    if (jobId) {
      const { uploadToS3 } = await import('~/utils/s3-utils')
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

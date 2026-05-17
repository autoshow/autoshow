import { wrapWithSafetyPrefix } from '~/prompts/video-prompts'
import type { SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunGeminiVideoGeminiVideoFile as GeminiVideoFile,SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunGeminiVideoGeminiVideosOperation as GeminiVideosOperation,GenerateVideoResult,IProgressTracker,VeoAspectRatio,VeoOperation,VeoResolution,VideoModel,VideoPromptType,VideoSize } from '~/types'
import { downloadGeminiUri } from '~/routes/api/process/shared/gemini-rest'
import {
buildVideoFileName,
calculatePollingProgress,
handleVideoError,
MAX_POLL_ATTEMPTS,
POLL_INTERVAL_MS,
requireVideoEnvKey
} from './video-helpers'

const SERVICE_NAME = 'Veo'
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

const toVeoOperationView = (operation: GeminiVideosOperation): VeoOperation => {
  const obj = operation as unknown as Record<string, unknown>
  const result: VeoOperation = {}
  if (typeof obj.name === 'string') result.name = obj.name
  if (typeof obj.done === 'boolean') result.done = obj.done
  if (typeof obj.response === 'object' && obj.response !== null) {
    result.response = obj.response as NonNullable<VeoOperation['response']>
  }
  if (typeof obj.error === 'object' && obj.error !== null) {
    result.error = obj.error as NonNullable<VeoOperation['error']>
  }
  return result
}

const getOperationErrorMessage = (operation: GeminiVideosOperation): string | null => {
  return toVeoOperationView(operation).error?.message || null
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const getNestedValue = (value: unknown, path: ReadonlyArray<string | number>): unknown => {
  let current: unknown = value

  for (const segment of path) {
    if (typeof segment === 'number') {
      if (!Array.isArray(current) || segment >= current.length) {
        return undefined
      }
      current = current[segment]
      continue
    }

    if (!isRecord(current) || !(segment in current)) {
      return undefined
    }
    current = current[segment]
  }

  return current
}

const isDownloadableVideoFile = (value: unknown): value is GeminiVideoFile => {
  if (!isRecord(value) || typeof value.uri !== 'string' || value.uri.length === 0) {
    return false
  }

  return typeof value.mimeType !== 'string' || value.mimeType.startsWith('video/')
}

const findVideoFileInValue = (value: unknown, depth: number = 0): GeminiVideoFile | null => {
  if (depth > 8) {
    return null
  }

  if (isDownloadableVideoFile(value)) {
    return value
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findVideoFileInValue(item, depth + 1)
      if (match) {
        return match
      }
    }
    return null
  }

  if (!isRecord(value)) {
    return null
  }

  if ('video' in value) {
    const nestedVideo = findVideoFileInValue(value.video, depth + 1)
    if (nestedVideo) {
      return nestedVideo
    }
  }

  for (const nestedValue of Object.values(value)) {
    const match = findVideoFileInValue(nestedValue, depth + 1)
    if (match) {
      return match
    }
  }

  return null
}

const getFilteredVideoMessage = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return null
  }

  const response = getNestedValue(value, ['response'])
  if (!isRecord(response)) {
    return null
  }

  const filteredCount = getNestedValue(response, ['raiMediaFilteredCount'])
  if (typeof filteredCount !== 'number' || filteredCount < 1) {
    return null
  }

  const reasons = getNestedValue(response, ['raiMediaFilteredReasons'])
  const reasonText = Array.isArray(reasons) && reasons.length > 0
    ? reasons.filter((reason): reason is string => typeof reason === 'string').join(', ')
    : 'unknown reason'

  return `Veo filtered the generated video (${reasonText})`
}

const extractVideoFileFromParsedOperation = (operation: GeminiVideosOperation): GeminiVideoFile | null => {
  return findVideoFileInValue(toVeoOperationView(operation).response?.generatedVideos)
}

const extractVideoFileFromRawOperation = (rawOperation: unknown): GeminiVideoFile | null => {
  const candidatePaths: Array<Array<string | number>> = [
    ['response', 'generateVideoResponse', 'generatedSamples', 0, 'video'],
    ['response', 'generatedSamples', 0, 'video'],
    ['response', 'generatedVideos', 0, 'video'],
    ['response', 'videos', 0],
    ['response', 'video']
  ]

  for (const path of candidatePaths) {
    const candidate = getNestedValue(rawOperation, path)
    if (isDownloadableVideoFile(candidate)) {
      return candidate
    }
  }

  return findVideoFileInValue(getNestedValue(rawOperation, ['response']))
}

const buildGeminiPredictLongRunningRequest = (
  apiKey: string,
  model: VideoModel,
  prompt: string,
  parameters: {
    aspectRatio: VeoAspectRatio
    resolution: VeoResolution
    durationSeconds: number
  }
): { url: string; init: RequestInit } => {
  return {
    url: `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:predictLongRunning`,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters
      })
    }
  }
}

const callGeminiPredictLongRunning = async (
  apiKey: string,
  model: VideoModel,
  prompt: string,
  parameters: {
    aspectRatio: VeoAspectRatio
    resolution: VeoResolution
    durationSeconds: number
  }
): Promise<GeminiVideosOperation> => {
  const request = buildGeminiPredictLongRunningRequest(apiKey, model, prompt, parameters)
  const response = await fetch(request.url, request.init)
  const rawText = await response.text()

  if (!response.ok) {
    throw new Error(rawText.trim() || `Failed to start Veo operation: ${response.status} ${response.statusText}`)
  }

  return JSON.parse(rawText) as GeminiVideosOperation
}

const getGeminiOperation = async (
  apiKey: string,
  operationName: string
): Promise<GeminiVideosOperation> => {
  const url = `${GEMINI_API_BASE_URL}/${operationName}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch raw Veo operation: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<GeminiVideosOperation>
}

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
  apiKey: string,
  prompt: string,
  model: VideoModel,
  size: VideoSize,
  duration: number,
  aspectRatio?: string
): Promise<GeminiVideosOperation> => {

  const safePrompt = wrapWithSafetyPrefix(prompt)

  const resolution = mapToVeoResolution(size)
  const veoAspectRatio = aspectRatio === '9:16' ? '9:16' : getAspectRatioFromSize(size)

  validateResolutionDuration(resolution, duration)

  const operation = await callGeminiPredictLongRunning(apiKey, model, safePrompt, {
    aspectRatio: veoAspectRatio,
    resolution,
    durationSeconds: duration
  })

  return operation
}

const pollVeoVideoStatus = async (
  apiKey: string,
  operation: GeminiVideosOperation,
  progressTracker?: IProgressTracker,
  stepNumber?: number,
  progressStart?: number,
  progressEnd?: number
): Promise<GeminiVideosOperation> => {

  let currentOp = operation

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (currentOp.done) {
      break
    }

    if (!currentOp.name) {
      throw new Error('Veo operation did not include a name')
    }

    await Bun.sleep(POLL_INTERVAL_MS)

    currentOp = await getGeminiOperation(apiKey, currentOp.name)

    if (progressTracker && stepNumber !== undefined && progressStart !== undefined && progressEnd !== undefined) {
      const scaledProgress = calculatePollingProgress(attempt, MAX_POLL_ATTEMPTS, progressStart, progressEnd)
      progressTracker.updateStepProgress(
        stepNumber,
        scaledProgress,
        `Rendering video: ${Math.min(attempt / MAX_POLL_ATTEMPTS * 100, 99).toFixed(0)}%`
      )
    }

    if (currentOp.done) {
      return currentOp
    }

    const errorMessage = getOperationErrorMessage(currentOp)
    if (errorMessage) {
      throw new Error(errorMessage)
    }

    if (attempt % 6 === 0) {
    }
  }

  if (!currentOp.done) {
    throw new Error('Veo video generation timed out after 10 minutes')
  }

  return currentOp
}

const downloadVeoVideo = async (
  operation: GeminiVideosOperation,
  outputPath: string,
  apiKey: string
): Promise<{ path: string; size: number }> => {
  let videoFile = extractVideoFileFromParsedOperation(operation)

  if (!videoFile && operation.name) {

    const rawOperation = await getGeminiOperation(apiKey, operation.name)
    videoFile = extractVideoFileFromRawOperation(rawOperation)

    if (!videoFile) {
      const filteredMessage = getFilteredVideoMessage(rawOperation)
      if (filteredMessage) {
        throw new Error(filteredMessage)
      }
    }
  }

  if (!videoFile?.uri) {
    throw new Error('No video in Veo operation response')
  }

  await downloadGeminiUri(apiKey, videoFile.uri, outputPath)

  const file = Bun.file(outputPath)
  const size = file.size

  return { path: outputPath, size }
}

/*
  Veo REST uses predictLongRunning with an instances/parameters body. The
  operation response can surface either SDK-shaped generatedVideos or raw
  generateVideoResponse.generatedSamples, so the extraction logic above keeps
  both paths.
*/
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

    const operation = await createVeoVideoJob(apiKey, prompt, model, size, duration, aspectRatio)

    const completedOp = await pollVeoVideoStatus(
      apiKey,
      operation,
      progressTracker,
      stepNumber,
      progressStart,
      progressEnd
    )

    const completionError = getOperationErrorMessage(completedOp)
    if (completionError) {
      throw new Error(completionError)
    }

    const videoFileName = buildVideoFileName(videoType)
    const videoPath = `${outputDir}/${videoFileName}`
    const { size: fileSize } = await downloadVeoVideo(completedOp, videoPath, apiKey)

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

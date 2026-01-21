import { l, err } from '~/utils/logging'
import type { VideoModel, VideoSize, VideoPromptType, GenerateVideoResult, VideoJobResponse } from '~/types/main'
import { VideoJobResponseSchema, validateOrThrow } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { wrapWithSafetyPrefix } from '~/prompts/video-prompts'

const OPENAI_API_KEY = process.env['OPENAI_API_KEY']

type SoraSize = '720x1280' | '1280x720' | '1024x1792' | '1792x1024'

const mapToSoraSize = (size: VideoSize): SoraSize => {
  const sizeMap: Record<VideoSize, SoraSize> = {
    '1920x1080': '1792x1024',
    '1080x1920': '1024x1792',
    '1280x720': '1280x720',
    '720x1280': '720x1280'
  }
  return sizeMap[size]
}

const createVideoJob = async (
  prompt: string,
  model: VideoModel,
  size: VideoSize,
  duration: number
): Promise<VideoJobResponse> => {
  l('Creating Sora video job', { model, size, duration: `${duration}s` })
  
  const safePrompt = wrapWithSafetyPrefix(prompt)
  l('Prompt wrapped with safety prefix', { length: `${safePrompt.length} chars` })
  
  const soraSize = mapToSoraSize(size)
  l('Mapped size to Sora size', { inputSize: size, soraSize })
  
  const formData = new FormData()
  formData.append('model', model)
  formData.append('prompt', safePrompt)
  formData.append('size', soraSize)
  formData.append('seconds', String(duration))
  
  const response = await fetch('https://api.openai.com/v1/videos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: formData
  })
  
  const responseText = await response.text()
  l('Sora API response', { status: response.status, body: responseText.slice(0, 500) })
  
  if (!response.ok) {
    err(`Sora API error: ${response.status} - ${responseText}`)
    throw new Error(`Sora API error: ${response.status} - ${responseText}`)
  }
  
  let rawData: unknown
  try {
    rawData = JSON.parse(responseText)
  } catch {
    err('Failed to parse Sora API response as JSON', { responseText: responseText.slice(0, 500) })
    throw new Error(`Sora API returned invalid JSON: ${responseText.slice(0, 200)}`)
  }
  
  if (rawData === null || rawData === undefined) {
    err('Sora API returned null response body')
    throw new Error('Sora API returned empty response')
  }
  const data = validateOrThrow(VideoJobResponseSchema, rawData, 'Invalid Sora API response')
  l('Video job created', { id: data.id, status: data.status })
  
  return data
}

const pollVideoStatus = async (
  videoId: string,
  progressTracker?: IProgressTracker,
  stepNumber?: number,
  progressStart?: number,
  progressEnd?: number
): Promise<VideoJobResponse> => {
  const maxAttempts = 120
  const pollInterval = 5000
  
  l('Polling video status', { videoId })
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    })
    
    const responseText = await response.text()
    
    if (!response.ok) {
      err(`Failed to get video status: ${response.status} - ${responseText}`)
      throw new Error(`Failed to get video status: ${response.status} - ${responseText}`)
    }
    
    let rawData: unknown
    try {
      rawData = JSON.parse(responseText)
    } catch {
      err('Failed to parse Sora status response as JSON', { responseText: responseText.slice(0, 500) })
      throw new Error(`Sora API returned invalid JSON for status: ${responseText.slice(0, 200)}`)
    }
    
    if (rawData === null || rawData === undefined) {
      err('Sora API returned null status response')
      throw new Error('Sora API returned empty status response')
    }
    const data = validateOrThrow(VideoJobResponseSchema, rawData, 'Invalid Sora API status response')
    
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
      return data
    }
    
    if (data.status === 'failed') {
      const errorMessage = data.error?.message || 'Video generation failed'
      err(`Video job failed: ${errorMessage}`)
      throw new Error(errorMessage)
    }
    
    if (attempt % 6 === 0) {
      l('Video status', { status: data.status, progress: `${data.progress ?? 0}%` })
    }
    
    await Bun.sleep(pollInterval)
  }
  
  throw new Error('Video generation timed out after 10 minutes')
}

const downloadVideoContent = async (
  videoId: string,
  outputPath: string,
  variant: 'video' | 'thumbnail' = 'video'
): Promise<{ path: string, size: number }> => {
  const url = `https://api.openai.com/v1/videos/${videoId}/content${variant !== 'video' ? `?variant=${variant}` : ''}`
  
  l('Downloading content', { variant, videoId })
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    }
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    err(`Failed to download ${variant}: ${response.status} - ${errorText}`)
    throw new Error(`Failed to download ${variant}: ${response.status}`)
  }
  
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

export const generateVideo = async (
  prompt: string,
  model: VideoModel,
  size: VideoSize,
  duration: number,
  outputDir: string,
  videoType: VideoPromptType,
  progressTracker?: IProgressTracker,
  stepNumber?: number,
  progressStart?: number,
  progressEnd?: number
): Promise<GenerateVideoResult> => {
  try {
    if (!OPENAI_API_KEY) {
      err('OPENAI_API_KEY not found in environment')
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    l('Starting Sora video generation', { videoType })
    
    const job = await createVideoJob(prompt, model, size, duration)
    
    await pollVideoStatus(
      job.id,
      progressTracker,
      stepNumber,
      progressStart,
      progressEnd
    )
    
    const videoFileName = `video_${videoType}.mp4`
    const videoPath = `${outputDir}/${videoFileName}`
    const { size: fileSize } = await downloadVideoContent(job.id, videoPath, 'video')
    
    let thumbnailPath: string | undefined
    try {
      const thumbnailFileName = `video_${videoType}_thumb.webp`
      thumbnailPath = `${outputDir}/${thumbnailFileName}`
      await downloadVideoContent(job.id, thumbnailPath, 'thumbnail')
    } catch (thumbnailError) {
      l('Failed to download thumbnail', {
        error: thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error'
      })
      thumbnailPath = undefined
    }
    
    return {
      videoPath,
      thumbnailPath,
      fileSize
    }
  } catch (error) {
    err('Video generation failed', error)
    if (progressTracker && stepNumber !== undefined) {
      progressTracker.error(stepNumber, 'Video generation failed', error instanceof Error ? error.message : 'Unknown error')
    }
    throw error
  }
}

import type { IProgressTracker,Step5Metadata } from '~/types'
import { requireEnvKey } from '~/utils/env'
import { STEP_NUMBER,buildTTSMetadata,getAudioExtensionFromMimeType,handleTTSError,logTTSStart,saveTTSFile } from './tts-helpers'

const SERVICE_NAME = 'Runway'
const BASE_URL = 'https://api.dev.runwayml.com'
const RUNWAY_VERSION = '2024-11-06'
const PROMPT_LIMIT = 1000
const MAX_POLL_ATTEMPTS = 120
const POLL_INTERVAL_MS = 5000

const trimRunwayTTSPromptToLimit = (prompt: string): string => {
  if (prompt.length <= PROMPT_LIMIT) return prompt

  const trimmed = prompt.slice(0, PROMPT_LIMIT)
  return trimmed
}

const buildRunwayTTSRequestBody = (
  text: string,
  model: string,
  voice: string
) => {
  return {
    model,
    promptText: trimRunwayTTSPromptToLimit(text),
    voice: {
      type: 'runway-preset',
      presetId: voice
    }
  }
}

const pollRunwayTask = async (apiKey: string, taskId: string, progressTracker?: IProgressTracker): Promise<string> => {
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

    const data = await response.json() as { status?: string, output?: string[], error?: { message?: string } }

    if (data.status === 'SUCCEEDED') {
      const outputUrl = data.output?.[0]
      if (!outputUrl) {
        throw new Error('Runway task completed without output URL')
      }
      return outputUrl
    }

    if (data.status === 'FAILED' || data.status === 'CANCELED' || data.status === 'CANCELLED') {
      throw new Error(data.error?.message || `Runway task failed with status: ${data.status}`)
    }

    if (attempt % 6 === 0) {
    }

    progressTracker?.updateStepProgress(STEP_NUMBER, 30 + Math.floor((attempt / MAX_POLL_ATTEMPTS) * 40), 'Rendering speech with Runway')
    await Bun.sleep(POLL_INTERVAL_MS)
  }

  throw new Error('Runway TTS generation timed out after 10 minutes')
}

export const runRunwayTTS = async (
  text: string,
  outputDir: string,
  voice: string = 'Leslie',
  model: string = 'eleven_multilingual_v2',
  progressTracker?: IProgressTracker,
  _instructions?: string,
  jobId?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  try {
    const apiKey = requireEnvKey('RUNWAYML_API_SECRET')
    const startTime = Date.now()

    logTTSStart(SERVICE_NAME, voice, model, text.length)
    progressTracker?.updateStepProgress(STEP_NUMBER, 20, `Sending text to ${SERVICE_NAME} TTS`)

    const createResponse = await fetch(`${BASE_URL}/v1/text_to_speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': RUNWAY_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildRunwayTTSRequestBody(text, model, voice))
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      throw new Error(`Runway TTS create failed: ${createResponse.status} - ${errorText}`)
    }

    const task = await createResponse.json() as { id?: string }
    if (!task.id) {
      throw new Error('Runway TTS create response missing task id')
    }

    const outputUrl = await pollRunwayTask(apiKey, task.id, progressTracker)

    progressTracker?.updateStepProgress(STEP_NUMBER, 75, 'Downloading generated audio')

    const audioResponse = await fetch(outputUrl)
    if (!audioResponse.ok) {
      throw new Error(`Runway audio download failed: ${audioResponse.status}`)
    }

    const buffer = Buffer.from(await audioResponse.arrayBuffer())
    const extension = getAudioExtensionFromMimeType(audioResponse.headers.get('content-type'), 'mp3')
    const fileName = `speech.${extension}`
    const { audioPath, audioFileName, audioFileSize, ttsS3Url } = await saveTTSFile(buffer, outputDir, fileName, jobId)

    progressTracker?.updateStepProgress(STEP_NUMBER, 90, 'Calculating audio duration')

    const metadata = await buildTTSMetadata(
      'runway', model, voice, startTime, audioPath, audioFileName, audioFileSize, text.length, ttsS3Url
    )

    return { audioPath, metadata }
  } catch (error) {
    return handleTTSError(error, SERVICE_NAME, progressTracker)
  }
}

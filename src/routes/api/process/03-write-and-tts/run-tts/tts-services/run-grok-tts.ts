import type { IProgressTracker,Step5Metadata } from '~/types'
import { requireEnvKey } from '~/utils/env'
import { STEP_NUMBER,buildTTSMetadata,handleTTSError,logTTSStart,saveTTSFile } from './tts-helpers'

const SERVICE_NAME = 'Grok'

const buildGrokTTSRequestBody = (text: string, voice: string) => {
  return {
    text,
    voice_id: voice,
    language: 'auto',
    output_format: {
      codec: 'mp3'
    }
  }
}

export const runGrokXTTS = async (
  text: string,
  outputDir: string,
  voice: string = 'eve',
  model: string = 'grok-tts-beta',
  progressTracker?: IProgressTracker,
  _instructions?: string,
  jobId?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  try {
    const apiKey = requireEnvKey('XAI_API_KEY')
    const startTime = Date.now()

    logTTSStart(SERVICE_NAME, voice, model, text.length)
    progressTracker?.updateStepProgress(STEP_NUMBER, 20, `Sending text to ${SERVICE_NAME} TTS`)

    const response = await fetch('https://api.x.ai/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildGrokTTSRequestBody(text, voice))
    })

    if (!response.ok) {
      throw new Error(`${SERVICE_NAME} API request failed: ${response.status}`)
    }

    progressTracker?.updateStepProgress(STEP_NUMBER, 70, 'Saving audio file')

    const buffer = Buffer.from(await response.arrayBuffer())
    const { audioPath, audioFileName, audioFileSize, ttsS3Url } = await saveTTSFile(buffer, outputDir, 'speech.mp3', jobId)

    progressTracker?.updateStepProgress(STEP_NUMBER, 90, 'Calculating audio duration')

    const metadata = await buildTTSMetadata(
      'grok', model, voice, startTime, audioPath, audioFileName, audioFileSize, text.length, ttsS3Url
    )

    return { audioPath, metadata }
  } catch (error) {
    return handleTTSError(error, SERVICE_NAME, progressTracker)
  }
}

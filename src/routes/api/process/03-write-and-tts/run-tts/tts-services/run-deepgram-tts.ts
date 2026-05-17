import type { IProgressTracker,Step5Metadata } from '~/types'
import { requireEnvKey } from '~/utils/env'
import { STEP_NUMBER,buildTTSMetadata,handleTTSError,logTTSStart,saveTTSFile } from './tts-helpers'

const SERVICE_NAME = 'Deepgram'

const buildDeepgramTTSUrl = (model: string): string => {
  const url = new URL('https://api.deepgram.com/v1/speak')
  url.searchParams.set('model', model)
  url.searchParams.set('encoding', 'mp3')
  return url.toString()
}

export const runDeepgramTTS = async (
  text: string,
  outputDir: string,
  voice: string = 'aura-2-thalia-en',
  model: string = 'aura-2-thalia-en',
  progressTracker?: IProgressTracker,
  _instructions?: string,
  jobId?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  try {
    const apiKey = requireEnvKey('DEEPGRAM_API_KEY')
    const startTime = Date.now()

    logTTSStart(SERVICE_NAME, voice, model, text.length)
    progressTracker?.updateStepProgress(STEP_NUMBER, 20, `Sending text to ${SERVICE_NAME} TTS`)

    const response = await fetch(buildDeepgramTTSUrl(model), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    })

    if (!response.ok) {
      throw new Error(`${SERVICE_NAME} API request failed: ${response.status}`)
    }

    progressTracker?.updateStepProgress(STEP_NUMBER, 70, 'Saving audio file')

    const buffer = Buffer.from(await response.arrayBuffer())
    const { audioPath, audioFileName, audioFileSize, ttsS3Url } = await saveTTSFile(buffer, outputDir, 'speech.mp3', jobId)

    progressTracker?.updateStepProgress(STEP_NUMBER, 90, 'Calculating audio duration')

    const metadata = await buildTTSMetadata(
      'deepgram', model, voice, startTime, audioPath, audioFileName, audioFileSize, text.length, ttsS3Url
    )

    return { audioPath, metadata }
  } catch (error) {
    return handleTTSError(error, SERVICE_NAME, progressTracker)
  }
}

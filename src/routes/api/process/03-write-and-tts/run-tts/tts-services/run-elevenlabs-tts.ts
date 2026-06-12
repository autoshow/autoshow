import type { IProgressTracker,Step5Metadata } from '~/types'
import { requireEnvKey } from '~/utils/env'
import { STEP_NUMBER,buildTTSMetadata,handleTTSError,logTTSStart,saveTTSFile } from './tts-helpers'

const SERVICE_NAME = 'ElevenLabs'
const ELEVENLABS_OUTPUT_FORMAT = 'mp3_44100_128'

const buildElevenLabsTTSUrl = (voice: string): string => {
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`)
  url.searchParams.set('output_format', ELEVENLABS_OUTPUT_FORMAT)
  return url.toString()
}

const buildElevenLabsTTSRequestBody = (text: string, model: string): { text: string, model_id: string } => {
  return {
    text,
    model_id: model
  }
}

export const runElevenLabsTTS = async (
  text: string,
  outputDir: string,
  voice: string = 'JBFqnCBsd6RMkjVDRZzb',
  model: string = 'eleven_flash_v2_5',
  progressTracker?: IProgressTracker,
  jobId?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  try {
    const apiKey = requireEnvKey('ELEVENLABS_API_KEY')
    const startTime = Date.now()

    logTTSStart(SERVICE_NAME, voice, model, text.length)
    progressTracker?.updateStepProgress(STEP_NUMBER, 20, `Sending text to ${SERVICE_NAME} TTS`)

    const response = await fetch(buildElevenLabsTTSUrl(voice), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify(buildElevenLabsTTSRequestBody(text, model))
    })

    if (!response.ok) {
      throw new Error(`${SERVICE_NAME} API request failed: ${response.status}`)
    }

    progressTracker?.updateStepProgress(STEP_NUMBER, 70, 'Saving audio file')

    const buffer = Buffer.from(await response.arrayBuffer())
    const { audioPath, audioFileName, audioFileSize, ttsS3Url } = await saveTTSFile(buffer, outputDir, 'speech.mp3', jobId)

    progressTracker?.updateStepProgress(STEP_NUMBER, 90, 'Calculating audio duration')

    const metadata = await buildTTSMetadata(
      'elevenlabs', model, voice, startTime, audioPath, audioFileName, audioFileSize, text.length, ttsS3Url
    )

    return { audioPath, metadata }
  } catch (error) {
    return handleTTSError(error, SERVICE_NAME, progressTracker)
  }
}

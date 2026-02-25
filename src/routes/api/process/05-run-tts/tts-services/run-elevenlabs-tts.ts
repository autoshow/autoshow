import type { Step5Metadata, IProgressTracker } from '~/types'
import { requireEnvKey } from '~/utils/env'
import { err } from '~/utils/logging'
import { STEP_NUMBER, handleTTSError, saveTTSFile, buildTTSMetadata, logTTSStart } from './tts-helpers'

const SERVICE_NAME = 'ElevenLabs'

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

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: model,
        output_format: 'mp3_44100_128'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      err(`${SERVICE_NAME} API error: ${response.status} ${errorText}`)
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

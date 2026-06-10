import type { Step5Metadata, IProgressTracker } from '~/types'
import { requireEnvKey } from '~/utils/env'
import { err } from '~/utils/logging'
import { STEP_NUMBER, handleTTSError, saveTTSFile, buildTTSMetadata, logTTSStart } from './tts-helpers'

const SERVICE_NAME = '60db'

export const run60dbTTS = async (
  text: string,
  outputDir: string,
  voice: string = 'default',
  model: string = 'sixtydb-tts-v1',
  progressTracker?: IProgressTracker,
  jobId?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  try {
    const apiKey = requireEnvKey('SIXTYDB_API_KEY')
    const startTime = Date.now()

    logTTSStart(SERVICE_NAME, voice, model, text.length)
    progressTracker?.updateStepProgress(STEP_NUMBER, 20, `Sending text to ${SERVICE_NAME} TTS`)

    const response = await fetch('https://api.60db.ai/tts-synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        text,
        ...(voice && voice !== 'default' && { voice_id: voice }),
        output_format: 'mp3'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      err(`${SERVICE_NAME} API error: ${response.status} ${errorText}`)
      throw new Error(`${SERVICE_NAME} API request failed: ${response.status}`)
    }

    progressTracker?.updateStepProgress(STEP_NUMBER, 70, 'Saving audio file')

    const data = await response.json() as { success?: boolean, audio_base64?: string, message?: string }
    if (!data.audio_base64) {
      throw new Error(`${SERVICE_NAME} API returned no audio: ${data.message || 'unknown error'}`)
    }

    const buffer = Buffer.from(data.audio_base64, 'base64')
    const { audioPath, audioFileName, audioFileSize, ttsS3Url } = await saveTTSFile(buffer, outputDir, 'speech.mp3', jobId)

    progressTracker?.updateStepProgress(STEP_NUMBER, 90, 'Calculating audio duration')

    const metadata = await buildTTSMetadata(
      'sixtydb', model, voice, startTime, audioPath, audioFileName, audioFileSize, text.length, ttsS3Url
    )

    return { audioPath, metadata }
  } catch (error) {
    return handleTTSError(error, SERVICE_NAME, progressTracker)
  }
}

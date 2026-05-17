import type { IProgressTracker,Step5Metadata } from '~/types'
import { callOpenAICompatibleAudioSpeech } from '~/routes/api/process/shared/openai-compatible'
import { requireEnvKey } from '~/utils/env'
import { STEP_NUMBER,buildTTSMetadata,handleTTSError,logTTSStart,saveTTSFile } from './tts-helpers'

const SERVICE_NAME = 'OpenAI'

export const runOpenAITTS = async (
  text: string,
  outputDir: string,
  voice: string = 'coral',
  model: string = 'gpt-4o-mini-tts',
  progressTracker?: IProgressTracker,
  instructions?: string,
  jobId?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  try {
    const apiKey = requireEnvKey('OPENAI_API_KEY')
    const startTime = Date.now()

    logTTSStart(SERVICE_NAME, voice, model, text.length)
    progressTracker?.updateStepProgress(STEP_NUMBER, 20, `Sending text to ${SERVICE_NAME} TTS`)

    const audioBuffer = await callOpenAICompatibleAudioSpeech('openai', apiKey, {
      model,
      voice,
      input: text,
      response_format: 'wav',
      ...(instructions && { instructions })
    })

    progressTracker?.updateStepProgress(STEP_NUMBER, 70, 'Saving audio file')

    const buffer = Buffer.from(audioBuffer)
    const { audioPath, audioFileName, audioFileSize, ttsS3Url } = await saveTTSFile(buffer, outputDir, 'speech.wav', jobId)

    progressTracker?.updateStepProgress(STEP_NUMBER, 90, 'Calculating audio duration')

    const metadata = await buildTTSMetadata(
      'openai', model, voice, startTime, audioPath, audioFileName, audioFileSize, text.length, ttsS3Url
    )

    return { audioPath, metadata }
  } catch (error) {
    return handleTTSError(error, SERVICE_NAME, progressTracker)
  }
}

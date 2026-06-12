import type { IProgressTracker,Step5Metadata } from '~/types'
import { downloadDeapiResult,pollDeapiJob } from '~/utils/deapi-jobs'
import { requireEnvKey } from '~/utils/env'
import { STEP_NUMBER,buildTTSMetadata,handleTTSError,logTTSStart,saveTTSFile } from './tts-helpers'

const SERVICE_NAME = 'deAPI'

export const runDeapiTTS = async (
  text: string,
  outputDir: string,
  voice: string = 'af_sky',
  model: string = 'Kokoro',
  progressTracker?: IProgressTracker,
  _instructions?: string,
  jobId?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  try {
    const startTime = Date.now()

    logTTSStart(SERVICE_NAME, voice, model, text.length)
    progressTracker?.updateStepProgress(STEP_NUMBER, 20, `Creating ${SERVICE_NAME} TTS job`)

    requireEnvKey('DEAPI_API_KEY')
    const formData = new FormData()
    formData.append('text', text)
    formData.append('model', model)
    formData.append('lang', 'en-us')
    formData.append('speed', '1')
    formData.append('format', 'mp3')
    formData.append('sample_rate', '24000')
    formData.append('mode', 'custom_voice')
    formData.append('voice', voice)

    const response = await fetch('https://api.deapi.ai/api/v1/client/txt2audio', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env['DEAPI_API_KEY']!}`
      },
      body: formData
    })

    const responseText = await response.text()
    if (!response.ok) {
      throw new Error(`Failed to create deAPI TTS job: ${response.statusText} - ${responseText}`)
    }

    const requestId = JSON.parse(responseText)?.data?.request_id as string | undefined
    if (!requestId) {
      throw new Error('deAPI TTS create response missing request id')
    }

    const status = await pollDeapiJob(requestId, 'tts', progressTracker, {
      stepNumber: STEP_NUMBER,
      progressStart: 30,
      progressEnd: 75,
      progressLabel: 'Generating speech with deAPI'
    })

    const resultUrl = status.data.result_url
    if (!resultUrl) {
      throw new Error('deAPI TTS completed without result URL')
    }

    progressTracker?.updateStepProgress(STEP_NUMBER, 80, 'Downloading generated audio')

    const buffer = await downloadDeapiResult(resultUrl, 'tts')
    const { audioPath, audioFileName, audioFileSize, ttsS3Url } = await saveTTSFile(buffer, outputDir, 'speech.mp3', jobId)

    progressTracker?.updateStepProgress(STEP_NUMBER, 90, 'Calculating audio duration')

    const metadata = await buildTTSMetadata(
      'deapi', model, voice, startTime, audioPath, audioFileName, audioFileSize, text.length, ttsS3Url
    )

    return { audioPath, metadata }
  } catch (error) {
    return handleTTSError(error, SERVICE_NAME, progressTracker)
  }
}

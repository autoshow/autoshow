import type { Step5Metadata, TTSServiceType, IProgressTracker } from '~/types'
import { l, err } from '~/utils/logging'
import { calculateAudioDuration } from '~/utils/audio'
import { uploadToS3 } from '~/utils/s3-upload'

export const STEP_NUMBER = 5

export const handleTTSError = (
  error: unknown,
  serviceName: string,
  progressTracker?: IProgressTracker
): never => {
  err(`${serviceName} TTS generation failed`, error)
  progressTracker?.error(STEP_NUMBER, 'TTS generation failed', error instanceof Error ? error.message : 'Unknown error')
  throw error
}

export const saveTTSFile = async (
  buffer: Buffer,
  outputDir: string,
  fileName: string,
  jobId?: string
): Promise<{ audioPath: string, audioFileName: string, audioFileSize: number, ttsS3Url?: string }> => {
  const audioPath = `${outputDir}/${fileName}`
  await Bun.write(audioPath, buffer)
  const audioFile = Bun.file(audioPath)
  const audioFileSize = audioFile.size
  l('Audio file created', { fileName, size: `${audioFileSize} bytes` })

  let ttsS3Url: string | undefined
  if (jobId) {
    const s3Result = await uploadToS3(audioPath, jobId, 'tts')
    ttsS3Url = s3Result?.s3Url
  }

  return { audioPath, audioFileName: fileName, audioFileSize, ...(ttsS3Url && { ttsS3Url }) }
}

export const buildTTSMetadata = async (
  service: TTSServiceType,
  model: string,
  voice: string,
  startTime: number,
  audioPath: string,
  audioFileName: string,
  audioFileSize: number,
  inputTextLength: number,
  ttsS3Url?: string
): Promise<Step5Metadata> => {
  const audioDuration = await calculateAudioDuration(audioPath)
  const processingTime = Date.now() - startTime

  l('Text-to-speech completed', {
    processingTime: `${processingTime}ms`,
    audioDuration: `${audioDuration.toFixed(2)}s`
  })

  return {
    ttsService: service,
    ttsModel: model,
    ttsVoice: voice,
    processingTime,
    audioFileName,
    audioFileSize,
    audioDuration,
    inputTextLength,
    ttsS3Url
  }
}

export const logTTSStart = (
  serviceName: string,
  voice: string,
  model: string,
  textLength: number
): void => {
  l(`Starting ${serviceName} text-to-speech generation`, {
    voice,
    model,
    textLength: `${textLength} characters`
  })
}

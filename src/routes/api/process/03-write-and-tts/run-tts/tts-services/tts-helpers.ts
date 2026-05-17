import { findTTSModel } from '~/models/models-utils/model-lookup'
import type { IProgressTracker,Step5Metadata,TTSServiceType } from '~/types'
import { calculateAudioDuration } from '~/utils/audio'
import { TTS_PLACEHOLDER_COST_USD } from '~/utils/cost-helpers'
import { uploadToS3 } from '~/utils/s3-utils'

export const STEP_NUMBER = 5

const AUDIO_EXTENSION_BY_MIME: Record<string, string> = {
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
}

export const handleTTSError = (
  error: unknown,
  _serviceName: string,
  progressTracker?: IProgressTracker
): never => {
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

  const ttsModelConfig = findTTSModel(service, model)
  let totalCost: number
  let actualCostUsd: number
  if (ttsModelConfig?.costPerMillionChars != null) {
    const costUsd = (inputTextLength / 1_000_000) * ttsModelConfig.costPerMillionChars
    totalCost = costUsd
    actualCostUsd = costUsd
  } else {
    totalCost = TTS_PLACEHOLDER_COST_USD
    actualCostUsd = TTS_PLACEHOLDER_COST_USD
  }

  return {
    ttsService: service,
    ttsModel: model,
    ttsVoice: voice,
    processingTime,
    audioFileName,
    audioFileSize,
    audioDuration,
    inputTextLength,
    totalCost,
    actualCostUsd,
    ttsS3Url
  }
}

export const logTTSStart = (
  _serviceName: string,
  _voice: string,
  _model: string,
  _textLength: number
): void => {
}

export const getAudioExtensionFromMimeType = (
  mimeType: string | null | undefined,
  fallbackExtension: string = 'wav'
): string => {
  if (!mimeType) return fallbackExtension
  const normalized = mimeType.split(';')[0]?.trim().toLowerCase()
  if (!normalized) return fallbackExtension
  return AUDIO_EXTENSION_BY_MIME[normalized] || fallbackExtension
}

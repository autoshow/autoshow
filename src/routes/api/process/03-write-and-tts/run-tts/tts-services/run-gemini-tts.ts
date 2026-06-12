import type { IProgressTracker,Step5Metadata } from '~/types'
import {
callGeminiGenerateContent,
extractGeminiInlineData
} from '~/routes/api/process/shared/gemini-rest'
import { requireEnvKey } from '~/utils/env'
import { STEP_NUMBER,buildTTSMetadata,handleTTSError,logTTSStart,saveTTSFile } from './tts-helpers'

const SERVICE_NAME = 'Gemini'
const DEFAULT_GEMINI_PCM_SAMPLE_RATE = 24_000
const PCM_CHANNELS = 1
const PCM_BITS_PER_SAMPLE = 16
const WAV_HEADER_SIZE = 44

const isWaveAudioBuffer = (buffer: Buffer): boolean => (
  buffer.length >= 12 &&
  buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
  buffer.subarray(8, 12).toString('ascii') === 'WAVE'
)

const parseGeminiAudioSampleRate = (
  mimeType: string | null | undefined
): number => {
  if (!mimeType) return DEFAULT_GEMINI_PCM_SAMPLE_RATE

  for (const rawParameter of mimeType.split(';').slice(1)) {
    const [rawName, rawValue] = rawParameter.split('=', 2)
    if (rawName?.trim().toLowerCase() !== 'rate') continue

    const value = rawValue?.trim().replace(/^"|"$/g, '')
    const sampleRate = Number(value)
    if (Number.isSafeInteger(sampleRate) && sampleRate > 0) {
      return sampleRate
    }
  }

  return DEFAULT_GEMINI_PCM_SAMPLE_RATE
}

const wrapPcmAudioInWav = (
  pcmBuffer: Buffer,
  sampleRate: number = DEFAULT_GEMINI_PCM_SAMPLE_RATE
): Buffer => {
  const bytesPerSample = PCM_BITS_PER_SAMPLE / 8
  const blockAlign = PCM_CHANNELS * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const wavBuffer = Buffer.alloc(WAV_HEADER_SIZE + pcmBuffer.length)

  wavBuffer.write('RIFF', 0, 'ascii')
  wavBuffer.writeUInt32LE(36 + pcmBuffer.length, 4)
  wavBuffer.write('WAVE', 8, 'ascii')
  wavBuffer.write('fmt ', 12, 'ascii')
  wavBuffer.writeUInt32LE(16, 16)
  wavBuffer.writeUInt16LE(1, 20)
  wavBuffer.writeUInt16LE(PCM_CHANNELS, 22)
  wavBuffer.writeUInt32LE(sampleRate, 24)
  wavBuffer.writeUInt32LE(byteRate, 28)
  wavBuffer.writeUInt16LE(blockAlign, 32)
  wavBuffer.writeUInt16LE(PCM_BITS_PER_SAMPLE, 34)
  wavBuffer.write('data', 36, 'ascii')
  wavBuffer.writeUInt32LE(pcmBuffer.length, 40)
  pcmBuffer.copy(wavBuffer, WAV_HEADER_SIZE)

  return wavBuffer
}

const normalizeGeminiAudioBuffer = (
  audioData: string,
  mimeType: string | null | undefined
): Buffer => {
  const buffer = Buffer.from(audioData, 'base64')
  if (isWaveAudioBuffer(buffer)) return buffer

  return wrapPcmAudioInWav(buffer, parseGeminiAudioSampleRate(mimeType))
}

export const runGeminiTTS = async (
  text: string,
  outputDir: string,
  voice: string = 'Aoede',
  model: string = 'gemini-2.5-flash-preview-tts',
  progressTracker?: IProgressTracker,
  _instructions?: string,
  jobId?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  try {
    const apiKey = requireEnvKey('GEMINI_API_KEY')
    const startTime = Date.now()

    logTTSStart(SERVICE_NAME, voice, model, text.length)
    progressTracker?.updateStepProgress(STEP_NUMBER, 20, `Sending text to ${SERVICE_NAME} TTS`)

    const response = await callGeminiGenerateContent(apiKey, model, {
      contents: text,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice
            }
          }
        }
      }
    })

    const audioPart = extractGeminiInlineData(response, 'audio/')
    if (!audioPart?.data) {
      throw new Error('No audio data in Gemini response')
    }

    progressTracker?.updateStepProgress(STEP_NUMBER, 70, 'Saving audio file')

    const buffer = normalizeGeminiAudioBuffer(audioPart.data, audioPart.mimeType)
    const { audioPath, audioFileName, audioFileSize, ttsS3Url } = await saveTTSFile(buffer, outputDir, 'speech.wav', jobId)

    progressTracker?.updateStepProgress(STEP_NUMBER, 90, 'Calculating audio duration')

    const metadata = await buildTTSMetadata(
      'gemini', model, voice, startTime, audioPath, audioFileName, audioFileSize, text.length, ttsS3Url
    )

    return { audioPath, metadata }
  } catch (error) {
    return handleTTSError(error, SERVICE_NAME, progressTracker)
  }
}

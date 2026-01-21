import OpenAI from 'openai'
import { l, err } from '~/utils/logging'
import type { Step5Metadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'

const OPENAI_API_KEY = process.env['OPENAI_API_KEY']

const calculateAudioDuration = async (audioPath: string): Promise<number> => {
  try {
    const result = await Bun.$`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${audioPath}`.text()
    const duration = parseFloat(result.trim())
    return isFinite(duration) ? duration : 0
  } catch (error) {
    err('Failed to calculate audio duration', error)
    return 0
  }
}

export const generateSpeechOpenAI = async (
  text: string,
  outputDir: string,
  voice: string = 'coral',
  model: string = 'gpt-4o-mini-tts',
  progressTracker?: IProgressTracker,
  instructions?: string
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  try {
    if (!OPENAI_API_KEY) {
      err('OPENAI_API_KEY not found in environment')
      progressTracker?.error(5, 'Configuration error', 'OPENAI_API_KEY environment variable is required')
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    l('Starting OpenAI text-to-speech generation', {
      voice,
      model,
      textLength: `${text.length} characters`
    })
    
    progressTracker?.updateStepProgress(5, 20, 'Sending text to OpenAI TTS')
    
    const startTime = Date.now()
    const client = new OpenAI({ apiKey: OPENAI_API_KEY })
    
    const response = await client.audio.speech.create({
      model,
      voice: voice as any,
      input: text,
      response_format: 'wav',
      ...(instructions && { instructions })
    })
    
    progressTracker?.updateStepProgress(5, 70, 'Saving audio file')
    
    const audioFileName = 'speech.wav'
    const audioPath = `${outputDir}/${audioFileName}`
    
    const buffer = Buffer.from(await response.arrayBuffer())
    await Bun.write(audioPath, buffer)
    
    const audioFile = Bun.file(audioPath)
    const audioFileSize = audioFile.size
    
    l('Audio file created', { fileName: audioFileName, size: `${audioFileSize} bytes` })
    
    progressTracker?.updateStepProgress(5, 90, 'Calculating audio duration')
    
    const audioDuration = await calculateAudioDuration(audioPath)
    
    const processingTime = Date.now() - startTime
    
    l('Text-to-speech completed', {
      processingTime: `${processingTime}ms`,
      audioDuration: `${audioDuration.toFixed(2)}s`
    })
    
    const metadata: Step5Metadata = {
      ttsService: 'openai',
      ttsModel: model,
      ttsVoice: voice,
      processingTime,
      audioFileName,
      audioFileSize,
      audioDuration,
      inputTextLength: text.length
    }
    
    return { audioPath, metadata }
  } catch (error) {
    err('Failed to generate speech with OpenAI', error)
    progressTracker?.error(5, 'TTS generation failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

export const checkOpenAITTSHealth = async (): Promise<boolean> => {
  try {
    if (!OPENAI_API_KEY) {
      err('OPENAI_API_KEY not found in environment')
      return false
    }

    const client = new OpenAI({ apiKey: OPENAI_API_KEY })
    
    await client.models.list()
    return true
  } catch (error) {
    err('OpenAI TTS health check failed', error)
    return false
  }
}
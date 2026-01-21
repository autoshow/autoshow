import { l, err } from '~/utils/logging'
import type { Step5Metadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'

const ELEVENLABS_API_KEY = process.env['ELEVENLABS_API_KEY']

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

export const generateSpeechElevenlabs = async (
  text: string,
  outputDir: string,
  voice: string = 'JBFqnCBsd6RMkjVDRZzb',
  model: string = 'eleven_flash_v2_5',
  progressTracker?: IProgressTracker
): Promise<{ audioPath: string, metadata: Step5Metadata }> => {
  try {
    if (!ELEVENLABS_API_KEY) {
      err('ELEVENLABS_API_KEY not found in environment')
      progressTracker?.error(5, 'Configuration error', 'ELEVENLABS_API_KEY environment variable is required')
      throw new Error('ELEVENLABS_API_KEY environment variable is required')
    }

    l('Starting Elevenlabs text-to-speech generation', {
      voice,
      model,
      textLength: `${text.length} characters`
    })
    
    progressTracker?.updateStepProgress(5, 20, 'Sending text to Elevenlabs TTS')
    
    const startTime = Date.now()
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: model,
        output_format: 'mp3_44100_128'
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      err(`Elevenlabs API error: ${response.status} ${errorText}`)
      progressTracker?.error(5, 'TTS generation failed', `API returned ${response.status}`)
      throw new Error(`Elevenlabs API request failed: ${response.status}`)
    }
    
    progressTracker?.updateStepProgress(5, 70, 'Saving audio file')
    
    const audioFileName = 'speech.mp3'
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
      ttsService: 'elevenlabs',
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
    err('Failed to generate speech with Elevenlabs', error)
    progressTracker?.error(5, 'TTS generation failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

export const checkElevenlabsTTSHealth = async (): Promise<boolean> => {
  try {
    if (!ELEVENLABS_API_KEY) {
      err('ELEVENLABS_API_KEY not found in environment')
      return false
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    })
    
    return response.ok
  } catch (error) {
    err('Elevenlabs TTS health check failed', error)
    return false
  }
}
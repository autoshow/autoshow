import OpenAI from 'openai'
import { err } from '~/utils/logging'
import type { TranscriptionResult, Step2Metadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { parseGroqOutput } from './parse-groq-output'

const GROQ_API_KEY = process.env['GROQ_API_KEY']

const countTokens = (text: string): number => {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

const captureConsoleOutput = (): { restore: () => void, getLogs: () => string[] } => {
  const capturedLogs: string[] = []
  const originalLog = console.log
  const originalDebug = console.debug
  
  console.log = (...args: unknown[]) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    if (message.includes('Groq:DEBUG') || message.includes('groq')) {
      capturedLogs.push(message)
    } else {
      originalLog(...args)
    }
  }
  
  console.debug = (...args: unknown[]) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    capturedLogs.push(message)
  }
  
  return {
    restore: () => {
      console.log = originalLog
      console.debug = originalDebug
    },
    getLogs: () => capturedLogs
  }
}

export const transcribeWithGroq = async (
  audioPath: string,
  outputDir: string,
  segmentOffsetMinutes: number = 0,
  segmentNumber?: number,
  totalSegments?: number,
  model: string = 'whisper-large-v3-turbo',
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  const capture = captureConsoleOutput()
  
  try {
    if (!GROQ_API_KEY) {
      err(`GROQ_API_KEY not found in environment`)
      progressTracker?.error(2, 'Configuration error', 'GROQ_API_KEY environment variable is required')
      throw new Error('GROQ_API_KEY environment variable is required')
    }

    if (segmentNumber && totalSegments) {
      progressTracker?.updateStepWithSubStep(2, segmentNumber, totalSegments, `Segment ${segmentNumber}/${totalSegments}`, `Transcribing segment ${segmentNumber} of ${totalSegments}`)
    } else {
      progressTracker?.updateStepProgress(2, baseProgress + 10, 'Preparing transcription')
    }
    
    const startTime = Date.now()
    const client = new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    })
    
    progressTracker?.updateStepProgress(2, baseProgress + 20, 'Sending audio to Groq')
    
    const audioFile = Bun.file(audioPath)
    const audioBuffer = await audioFile.arrayBuffer()
    const fileName = audioPath.split('/').pop() || 'audio.wav'
    const audioFileObj = new File([audioBuffer], fileName, { type: 'audio/wav' })
    
    const transcription = await client.audio.transcriptions.create({
      file: audioFileObj,
      model,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    })
    
    progressTracker?.updateStepProgress(2, baseProgress + 80, 'Processing transcription results')
    
    const { text, segments } = parseGroqOutput(transcription, segmentOffsetMinutes)
    
    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(text)
    
    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const formattedTranscriptPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedText = segments.map(seg => `[${seg.start}] ${seg.text}`).join('\n')
    await Bun.write(formattedTranscriptPath, formattedText)
    
    if (!segmentNumber) {
      progressTracker?.completeStep(2, 'Transcription complete')
    }
    
    const metadata: Step2Metadata = {
      transcriptionService: 'groq',
      transcriptionModel: model,
      processingTime,
      tokenCount
    }
    
    capture.restore()
    
    return {
      result: { text, segments },
      metadata
    }
  } catch (error) {
    capture.restore()
    
    const capturedLogs = capture.getLogs()
    if (capturedLogs.length > 0) {
      err('Groq API Debug Logs:')
      capturedLogs.forEach(log => console.error(log))
    }
    
    err(`Failed to transcribe with Groq`, error)
    progressTracker?.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

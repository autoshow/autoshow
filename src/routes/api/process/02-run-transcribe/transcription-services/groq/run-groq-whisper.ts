import OpenAI from 'openai'
import { l, err } from '~/utils/logging'
import { countTokens } from '~/utils/audio'
import type { TranscriptionResult, Step2Metadata, IProgressTracker } from '~/types'
import { parseGroqOutput } from './parse-groq-output'
import { formatTranscriptOutput } from '../transcription-helpers'

const GROQ_API_KEY = process.env['GROQ_API_KEY']

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
  try {
    if (!GROQ_API_KEY) {
      err('GROQ_API_KEY not found in environment')
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

    const response = await client.audio.transcriptions.create({
      file: audioFileObj,
      model,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    })

    progressTracker?.updateStepProgress(2, baseProgress + 80, 'Processing transcription results')

    const transcription = parseGroqOutput(response, segmentOffsetMinutes)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const outputPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    if (!segmentNumber) {
      progressTracker?.completeStep(2, 'Transcription complete')
    }

    const metadata: Step2Metadata = {
      transcriptionService: 'groq',
      transcriptionModel: model,
      processingTime,
      tokenCount
    }

    l('Groq transcription completed', {
      processingTimeMs: processingTime,
      tokenCount,
      transcriptLength: transcription.text.length,
      segmentCount: transcription.segments.length,
      outputPath,
      segmentNumber,
      totalSegments
    })

    return {
      result: transcription,
      metadata
    }
  } catch (error) {
    err('Failed to transcribe with Groq', error)
    progressTracker?.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

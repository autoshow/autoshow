import type { IProgressTracker,Step2Metadata,TranscriptionResult,VerboseTranscription } from '~/types'
import { callOpenAICompatibleAudioTranscription } from '~/routes/api/process/shared/openai-compatible'
import { calculateActualCostUsd,countTokens,formatTranscriptOutput } from '../transcription-helpers'
import { parseGroqOutput } from './parse-groq-output'

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
      progressTracker?.error(2, 'Configuration error', 'GROQ_API_KEY environment variable is required')
      throw new Error('GROQ_API_KEY environment variable is required')
    }

    if (segmentNumber && totalSegments) {
      progressTracker?.updateStepWithSubStep(2, segmentNumber, totalSegments, `Segment ${segmentNumber}/${totalSegments}`, `Transcribing segment ${segmentNumber} of ${totalSegments}`)
    } else {
      progressTracker?.updateStepProgress(2, baseProgress + 10, 'Preparing transcription')
    }

    const startTime = Date.now()

    progressTracker?.updateStepProgress(2, baseProgress + 20, 'Sending audio to Groq')

    const response = await callOpenAICompatibleAudioTranscription('groq', GROQ_API_KEY, {
      filePath: audioPath,
      model,
      responseFormat: 'verbose_json',
      timestampGranularities: ['segment'],
      mimeType: 'audio/wav'
    })

    progressTracker?.updateStepProgress(2, baseProgress + 80, 'Processing transcription results')

    const transcriptionResponse = response as VerboseTranscription
    const transcription = parseGroqOutput(transcriptionResponse, segmentOffsetMinutes)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const outputPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    if (!segmentNumber) {
      progressTracker?.completeStep(2, 'Transcription complete')
    }

    const audioDuration = transcriptionResponse.duration
    const actualCostUsd = calculateActualCostUsd('groq', model, audioDuration)

    const metadata: Step2Metadata = {
      transcriptionService: 'groq',
      transcriptionModel: model,
      processingTime,
      tokenCount,
      actualCostUsd
    }

    return {
      result: transcription,
      metadata
    }
  } catch (error) {
    progressTracker?.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

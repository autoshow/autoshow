import { err } from '~/utils/logging'
import type { TranscriptionResult, Step2Metadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { parseLemonfoxOutput } from './parse-lemonfox-output'

const LEMONFOX_API_KEY = process.env['LEMONFOX_API_KEY']

const countTokens = (text: string): number => {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

export const transcribeWithLemonfox = async (
  audioPath: string,
  outputDir: string,
  segmentOffsetMinutes: number = 0,
  segmentNumber?: number,
  totalSegments?: number,
  model: string = 'whisper-large-v3',
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  try {
    if (!LEMONFOX_API_KEY) {
      err('LEMONFOX_API_KEY not found in environment')
      progressTracker?.error(2, 'Configuration error', 'LEMONFOX_API_KEY environment variable is required')
      throw new Error('LEMONFOX_API_KEY environment variable is required')
    }

    if (segmentNumber && totalSegments) {
      progressTracker?.updateStepWithSubStep(2, segmentNumber, totalSegments, `Segment ${segmentNumber}/${totalSegments}`, `Transcribing segment ${segmentNumber} of ${totalSegments}`)
    } else {
      progressTracker?.updateStepProgress(2, baseProgress + 10, 'Preparing transcription')
    }

    const startTime = Date.now()

    progressTracker?.updateStepProgress(2, baseProgress + 20, 'Sending audio to Lemonfox')

    const audioFile = Bun.file(audioPath)
    const audioBuffer = await audioFile.arrayBuffer()
    const fileName = audioPath.split('/').pop() || 'audio.wav'
    const audioFileObj = new File([audioBuffer], fileName, { type: 'audio/wav' })

    const formData = new FormData()
    formData.append('file', audioFileObj)
    formData.append('response_format', 'verbose_json')
    formData.append('speaker_labels', 'true')

    const response = await fetch('https://api.lemonfox.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LEMONFOX_API_KEY}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Lemonfox API error: ${response.status} - ${errorText}`)
    }

    const transcription = await response.json()

    progressTracker?.updateStepProgress(2, baseProgress + 80, 'Processing transcription results')

    const { text, segments } = parseLemonfoxOutput(transcription, segmentOffsetMinutes)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(text)

    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const formattedTranscriptPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedText = segments.map(seg => {
      const speakerPrefix = seg.speaker ? `[${seg.speaker}] ` : ''
      return `[${seg.start}] ${speakerPrefix}${seg.text}`
    }).join('\n')
    await Bun.write(formattedTranscriptPath, formattedText)

    if (!segmentNumber) {
      progressTracker?.completeStep(2, 'Transcription complete')
    }

    const metadata: Step2Metadata = {
      transcriptionService: 'lemonfox',
      transcriptionModel: model,
      processingTime,
      tokenCount
    }

    return {
      result: { text, segments },
      metadata
    }
  } catch (error) {
    err('Failed to transcribe with Lemonfox', error)
    progressTracker?.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

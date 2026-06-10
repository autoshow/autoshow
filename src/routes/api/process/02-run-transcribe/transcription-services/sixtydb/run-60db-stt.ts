import { l, err } from '~/utils/logging'
import { countTokens } from '~/utils/audio'
import type { TranscriptionResult, Step2Metadata, IProgressTracker } from '~/types'
import { SixtyDbSttResponseSchema, validateOrThrow } from '~/types'
import { parse60dbOutput } from './parse-60db-output'
import { formatTranscriptOutput } from '../transcription-helpers'

const SIXTYDB_API_BASE = 'https://api.60db.ai'
const SIXTYDB_API_KEY = process.env['SIXTYDB_API_KEY']
const SIXTYDB_MAX_BYTES = 10 * 1024 * 1024

export const transcribeWith60db = async (
  audioPath: string,
  outputDir: string,
  segmentOffsetMinutes: number = 0,
  segmentNumber?: number,
  totalSegments?: number,
  model: string = '60db-stt-v1',
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  try {
    if (!SIXTYDB_API_KEY) {
      err('SIXTYDB_API_KEY not found in environment')
      progressTracker?.error(2, 'Configuration error', 'SIXTYDB_API_KEY environment variable is required')
      throw new Error('SIXTYDB_API_KEY environment variable is required')
    }

    const startTime = Date.now()

    if (segmentNumber && totalSegments) {
      progressTracker?.updateStepWithSubStep(
        2,
        segmentNumber,
        totalSegments,
        `Segment ${segmentNumber}/${totalSegments}`,
        `Uploading audio segment ${segmentNumber}/${totalSegments} to 60db`
      )
    } else {
      progressTracker?.updateStepProgress(2, baseProgress + 10, 'Uploading audio to 60db')
    }

    const audioFile = Bun.file(audioPath)
    const audioBuffer = await audioFile.arrayBuffer()
    const fileName = audioPath.split('/').pop() || 'audio.wav'

    if (audioBuffer.byteLength > SIXTYDB_MAX_BYTES) {
      const mb = (audioBuffer.byteLength / (1024 * 1024)).toFixed(1)
      throw new Error(
        `Audio is ${mb}MB which exceeds 60db's 10MB per-request limit. ` +
        `Use a shorter clip, or pick a transcription service without this limit for long audio.`
      )
    }

    const formData = new FormData()
    formData.append('file', new Blob([audioBuffer]), fileName)
    formData.append('diarize', 'true')
    formData.append('return_timestamps', 'word')

    progressTracker?.updateStepProgress(2, baseProgress + 30, 'Transcribing with 60db')

    const apiResponse = await fetch(`${SIXTYDB_API_BASE}/stt`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SIXTYDB_API_KEY}`
      },
      body: formData
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      err(`60db transcription failed. Status: ${apiResponse.status}`, { error: errorText })
      throw new Error(`60db transcription failed: ${apiResponse.statusText} - ${errorText}`)
    }

    progressTracker?.updateStepProgress(2, baseProgress + 80, 'Processing 60db response')

    const rawData = await apiResponse.json()
    const response = validateOrThrow(SixtyDbSttResponseSchema, rawData, 'Invalid 60db speech-to-text response')

    progressTracker?.updateStepProgress(2, baseProgress + 90, 'Parsing 60db transcription')

    const transcription = parse60dbOutput(response, segmentOffsetMinutes)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const outputPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    if (!segmentNumber) {
      progressTracker?.completeStep(2, '60db transcription complete')
    }

    const metadata: Step2Metadata = {
      transcriptionService: 'sixtydb',
      transcriptionModel: model,
      processingTime,
      tokenCount
    }

    l('60db transcription completed', {
      processingTimeMs: processingTime,
      tokenCount,
      transcriptLength: transcription.text.length,
      segmentCount: transcription.segments.length,
      outputPath,
      segmentNumber,
      totalSegments,
      language: response.language
    })

    return {
      result: transcription,
      metadata
    }
  } catch (error) {
    err('Failed to transcribe with 60db', error)
    progressTracker?.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

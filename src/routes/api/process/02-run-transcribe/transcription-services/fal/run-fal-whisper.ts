import { l, err } from '~/utils/logging'
import { countTokens } from '~/utils/audio'
import type { TranscriptionResult, Step2Metadata, IProgressTracker } from '~/types'
import { uploadAudioToFal } from './upload-audio'
import { submitToFalQueue } from './submit-queue'
import { pollFalStatus } from './poll-status'
import { parseFalOutput } from './parse-fal-output'
import { formatTranscriptOutput } from '../transcription-helpers'

const FAL_API_KEY = process.env['FAL_API_KEY']

export const transcribeWithFal = async (
  audioPath: string,
  outputDir: string,
  segmentOffsetMinutes: number = 0,
  segmentNumber?: number,
  totalSegments?: number,
  model: string = 'fal-ai/whisper',
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  try {
    if (!FAL_API_KEY) {
      err('FAL_API_KEY not found in environment')
      progressTracker?.error(2, 'Configuration error', 'FAL_API_KEY environment variable is required')
      throw new Error('FAL_API_KEY environment variable is required')
    }

    if (segmentNumber && totalSegments) {
      progressTracker?.updateStepWithSubStep(
        2,
        segmentNumber,
        totalSegments,
        `Segment ${segmentNumber}/${totalSegments}`,
        `Transcribing segment ${segmentNumber} of ${totalSegments} with speaker diarization`
      )
    } else {
      progressTracker?.updateStepProgress(2, baseProgress + 10, 'Preparing transcription with speaker diarization')
    }

    const startTime = Date.now()

    progressTracker?.updateStepProgress(2, baseProgress + 15, 'Uploading audio to Fal storage')
    const audioUrl = await uploadAudioToFal(audioPath, FAL_API_KEY)

    progressTracker?.updateStepProgress(2, baseProgress + 20, 'Submitting to Fal queue')
    const requestId = await submitToFalQueue(audioUrl, FAL_API_KEY)

    progressTracker?.updateStepProgress(2, baseProgress + 25, 'Waiting for transcription with diarization')
    const response = await pollFalStatus(requestId, FAL_API_KEY, progressTracker, baseProgress)

    progressTracker?.updateStepProgress(2, baseProgress + 80, 'Processing transcription results')

    const transcription = parseFalOutput(response, segmentOffsetMinutes)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const outputPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    if (!segmentNumber) {
      progressTracker?.completeStep(2, 'Transcription with speaker diarization complete')
    }

    const metadata: Step2Metadata = {
      transcriptionService: 'fal',
      transcriptionModel: model,
      processingTime,
      tokenCount
    }

    l('Fal transcription completed', {
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
    err('Failed to transcribe with Fal', error)
    progressTracker?.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

import type { IProgressTracker,Step2Metadata,TranscriptionResult } from '~/types'
import { calculateActualCostUsd,countTokens,formatTranscriptOutput } from '../transcription-helpers'
import { createSonioxTranscription } from './create-transcription'
import { getSonioxTranscript } from './get-transcript'
import { parseSonioxOutput } from './parse-soniox-output'
import { pollSonioxTranscription } from './poll-transcription'
import { uploadAudioToSoniox } from './upload-audio'

const SONIOX_API_BASE = 'https://api.soniox.com/v1'

const cleanupSonioxResources = async (
  apiKey: string,
  transcriptionId?: string,
  fileId?: string
): Promise<void> => {
  if (transcriptionId) {
    try {
      const response = await fetch(`${SONIOX_API_BASE}/transcriptions/${transcriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })

      if (response.ok) {
      } else {
      }
    } catch (error) {
    }
  }

  if (fileId) {
    try {
      const response = await fetch(`${SONIOX_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })

      if (response.ok) {
      } else {
      }
    } catch (error) {
    }
  }
}

const SONIOX_API_KEY = process.env['SONIOX_API_KEY']

export const transcribeWithSoniox = async (
  audioPath: string,
  outputDir: string,
  segmentOffsetMinutes: number = 0,
  segmentNumber?: number,
  totalSegments?: number,
  model: string = 'stt-async-v4',
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<{ result: TranscriptionResult; metadata: Step2Metadata }> => {
  let fileId: string | undefined
  let transcriptionId: string | undefined

  try {
    if (!SONIOX_API_KEY) {
      progressTracker?.error(2, 'Configuration error', 'SONIOX_API_KEY environment variable is required')
      throw new Error('SONIOX_API_KEY environment variable is required')
    }

    const startTime = Date.now()

    if (segmentNumber && totalSegments) {
      progressTracker?.updateStepWithSubStep(
        2,
        segmentNumber,
        totalSegments,
        `Segment ${segmentNumber}/${totalSegments}`,
        `Uploading audio segment ${segmentNumber}/${totalSegments} to Soniox`
      )
    } else {
      progressTracker?.updateStepProgress(2, baseProgress + 5, 'Uploading audio to Soniox')
    }

    fileId = await uploadAudioToSoniox(audioPath, SONIOX_API_KEY)

    progressTracker?.updateStepProgress(2, baseProgress + 15, 'Creating Soniox transcription job')

    transcriptionId = await createSonioxTranscription(fileId, model, SONIOX_API_KEY)

    progressTracker?.updateStepProgress(2, baseProgress + 20, 'Waiting for Soniox transcription')

    const pollResult = await pollSonioxTranscription(
      transcriptionId,
      SONIOX_API_KEY,
      progressTracker,
      baseProgress
    )

    progressTracker?.updateStepProgress(2, baseProgress + 80, 'Fetching Soniox transcript')

    const transcript = await getSonioxTranscript(transcriptionId, SONIOX_API_KEY)

    progressTracker?.updateStepProgress(2, baseProgress + 85, 'Processing Soniox response')

    const transcription = parseSonioxOutput(transcript, segmentOffsetMinutes)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const outputPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    if (!segmentNumber) {
      progressTracker?.completeStep(2, 'Soniox transcription complete')
    }

    const audioDurationSeconds = pollResult.audio_duration_ms != null
      ? pollResult.audio_duration_ms / 1000
      : undefined
    const actualCostUsd = calculateActualCostUsd('soniox', model, audioDurationSeconds)

    const metadata: Step2Metadata = {
      transcriptionService: 'soniox',
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
  } finally {
    if (SONIOX_API_KEY) {
      await cleanupSonioxResources(SONIOX_API_KEY, transcriptionId, fileId)
    }
  }
}

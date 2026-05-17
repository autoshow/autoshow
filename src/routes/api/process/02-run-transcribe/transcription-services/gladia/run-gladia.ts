import type { IProgressTracker,Step2Metadata,TranscriptionResult } from '~/types'
import { calculateActualCostUsd,countTokens,formatTranscriptOutput } from '../transcription-helpers'
import { createGladiaTranscription } from './create-transcription'
import { parseGladiaOutput } from './parse-gladia-output'
import { pollGladiaTranscription } from './poll-transcription'
import { uploadAudioToGladia } from './upload-audio'

export const transcribeWithGladia = async (
  audioPath: string,
  outputDir: string,
  segmentOffsetMinutes: number = 0,
  segmentNumber?: number,
  totalSegments?: number,
  model: string = 'gladia-v2',
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  try {
    const startTime = Date.now()

    if (segmentNumber && totalSegments) {
      progressTracker?.updateStepWithSubStep(
        2,
        segmentNumber,
        totalSegments,
        `Segment ${segmentNumber}/${totalSegments}`,
        `Uploading audio segment ${segmentNumber}/${totalSegments} to Gladia`
      )
    } else {
      progressTracker?.updateStepProgress(2, baseProgress + 10, 'Uploading audio to Gladia')
    }

    const uploadResponse = await uploadAudioToGladia(audioPath)

    progressTracker?.updateStepProgress(2, baseProgress + 20, 'Creating Gladia transcription job')

    const transcriptionInit = await createGladiaTranscription({
      audioUrl: uploadResponse.audio_url,
      enableDiarization: true,
      detectLanguage: true
    })

    progressTracker?.updateStepProgress(2, baseProgress + 30, 'Waiting for Gladia transcription to complete')

    const response = await pollGladiaTranscription(
      transcriptionInit.result_url,
      progressTracker
    )

    progressTracker?.updateStepProgress(2, baseProgress + 90, 'Parsing Gladia transcription')

    const transcription = parseGladiaOutput(response, segmentOffsetMinutes)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const outputPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    if (!segmentNumber) {
      progressTracker?.completeStep(2, 'Gladia transcription complete')
    }

    const actualCostUsd = calculateActualCostUsd('gladia', model, transcription.billingTimeSeconds)

    const metadata: Step2Metadata = {
      transcriptionService: 'gladia',
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

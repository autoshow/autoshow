import type { IProgressTracker,ProcessingOptions,Step2Metadata,TranscriptionResult,VideoMetadata } from '~/types'
import { calculateActualCostUsd,countTokens,formatTranscriptOutput } from '../transcription-helpers'
import { createSupadataTranscription } from './create-transcription'
import { parseSupadataOutput } from './parse-supadata-output'
import { pollSupadataTranscription } from './poll-transcription'

export const transcribeWithSupadata = async (
  url: string,
  _metadata: VideoMetadata,
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  model: string
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  try {
    const startTime = Date.now()

    progressTracker.updateStepProgress(2, 10, 'Creating Supadata transcription job')

    const response = await createSupadataTranscription(url)

    let transcriptContent

    if ('content' in response && response.content) {
      progressTracker.updateStepProgress(2, 80, 'Transcript received directly')
      transcriptContent = response.content
    } else if ('jobId' in response && response.jobId) {
      progressTracker.updateStepProgress(2, 20, 'Waiting for Supadata transcription to complete')
      const pollResult = await pollSupadataTranscription(response.jobId, progressTracker)
      transcriptContent = pollResult.content
    } else {
      throw new Error('Unexpected Supadata response: no content or jobId')
    }

    progressTracker.updateStepProgress(2, 90, 'Parsing Supadata transcription')

    const { transcription, durationSeconds } = parseSupadataOutput(transcriptContent || [])

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const outputPath = `${options.outputDir}/transcription.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    progressTracker.completeStep(2, 'Supadata transcription complete')

    const actualCostUsd = calculateActualCostUsd('supadata', model, durationSeconds)

    const step2Metadata: Step2Metadata = {
      transcriptionService: 'supadata',
      transcriptionModel: model,
      processingTime,
      tokenCount,
      actualCostUsd
    }

    return {
      result: transcription,
      metadata: step2Metadata
    }
  } catch (error) {
    progressTracker.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

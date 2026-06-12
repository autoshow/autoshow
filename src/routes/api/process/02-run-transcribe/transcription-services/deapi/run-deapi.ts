import type { IProgressTracker,ProcessingOptions,Step2Metadata,TranscriptionResult,VideoMetadata } from '~/types'
import { calculateActualCostUsd,countTokens,formatTranscriptOutput } from '../transcription-helpers'
import { createDeapiTranscription } from './create-transcription'
import { parseDeapiOutput } from './parse-deapi-output'
import { pollDeapiTranscription } from './poll-transcription'

export const transcribeWithDeapi = async (
  url: string,
  _metadata: VideoMetadata,
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  model: string
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  try {
    const startTime = Date.now()

    progressTracker.updateStepProgress(2, 10, 'Creating deAPI transcription job')

    const requestId = await createDeapiTranscription(url)

    progressTracker.updateStepProgress(2, 20, 'Waiting for deAPI transcription to complete')

    const response = await pollDeapiTranscription(requestId, progressTracker)

    progressTracker.updateStepProgress(2, 90, 'Parsing deAPI transcription')

    const { transcription, durationSeconds } = await parseDeapiOutput(response)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const outputPath = `${options.outputDir}/transcription.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    progressTracker.completeStep(2, 'deAPI transcription complete')

    const actualCostUsd = calculateActualCostUsd('deapi', model, durationSeconds)

    const step2Metadata: Step2Metadata = {
      transcriptionService: 'deapi',
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

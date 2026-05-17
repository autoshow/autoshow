import type { IProgressTracker,ProcessingOptions,Step2Metadata,TranscriptionResult,VideoMetadata } from '~/types'
import { calculateActualCostUsd,countTokens,formatTranscriptOutput } from '../transcription-helpers'
import { createGladiaTranscription } from './create-transcription'
import { parseGladiaOutput } from './parse-gladia-output'
import { pollGladiaTranscription } from './poll-transcription'

export const transcribeStreamingWithGladia = async (
  url: string,
  _metadata: VideoMetadata,
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  model: string
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  try {
    const startTime = Date.now()

    progressTracker.updateStepProgress(2, 10, 'Creating Gladia transcription job')

    const transcriptionInit = await createGladiaTranscription({
      audioUrl: url,
      enableDiarization: true,
      detectLanguage: true
    })

    progressTracker.updateStepProgress(2, 20, 'Waiting for Gladia transcription to complete')

    const response = await pollGladiaTranscription(
      transcriptionInit.result_url,
      progressTracker
    )

    progressTracker.updateStepProgress(2, 90, 'Parsing Gladia transcription')

    const transcription = parseGladiaOutput(response)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const outputPath = `${options.outputDir}/transcription.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    progressTracker.completeStep(2, 'Gladia transcription complete')

    const actualCostUsd = calculateActualCostUsd('gladia', model, transcription.billingTimeSeconds)

    const step2Metadata: Step2Metadata = {
      transcriptionService: 'gladia',
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

import { l, err } from '~/utils/logging'
import { countTokens } from '~/utils/audio'
import type { TranscriptionResult, Step2Metadata, VideoMetadata, ProcessingOptions, IProgressTracker } from '~/types'
import { createGladiaTranscription } from './create-transcription'
import { pollGladiaTranscription } from './poll-transcription'
import { parseGladiaOutput } from './parse-gladia-output'
import { formatTranscriptOutput } from '../transcription-helpers'

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

    const step2Metadata: Step2Metadata = {
      transcriptionService: 'gladia',
      transcriptionModel: model,
      processingTime,
      tokenCount
    }

    l('Gladia streaming transcription completed', {
      processingTimeMs: processingTime,
      tokenCount,
      transcriptLength: transcription.text.length,
      segmentCount: transcription.segments.length,
      outputPath,
      sourceUrl: url
    })

    return {
      result: transcription,
      metadata: step2Metadata
    }
  } catch (error) {
    err('Failed to transcribe streaming URL with Gladia', error)
    progressTracker.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

import { l, err } from '~/utils/logging'
import { countTokens } from '~/utils/audio'
import type { ProcessingOptions, VideoMetadata, TranscriptionResult, Step2Metadata, IProgressTracker } from '~/types'
import { parseHappyScribeOutput, downloadTranscript } from './parse-happyscribe-output'
import { createTranscription, pollTranscriptionStatus } from './create-transcription'
import { createExport, pollExportStatus } from './create-export'
import { formatTranscriptOutput } from '../transcription-helpers'

const HAPPYSCRIBE_API_KEY = process.env['HAPPYSCRIBE_API_KEY']
const HAPPYSCRIBE_ORGANIZATION_ID = process.env['HAPPYSCRIBE_ORGANIZATION_ID']

export const transcribeWithHappyScribe = async (
  url: string,
  metadata: VideoMetadata,
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  model: string
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  try {
    if (!HAPPYSCRIBE_API_KEY) {
      err('HAPPYSCRIBE_API_KEY not found in environment')
      progressTracker.error(2, 'Configuration error', 'HAPPYSCRIBE_API_KEY environment variable is required')
      throw new Error('HAPPYSCRIBE_API_KEY environment variable is required')
    }

    if (!HAPPYSCRIBE_ORGANIZATION_ID) {
      err('HAPPYSCRIBE_ORGANIZATION_ID not found in environment')
      progressTracker.error(2, 'Configuration error', 'HAPPYSCRIBE_ORGANIZATION_ID environment variable is required')
      throw new Error('HAPPYSCRIBE_ORGANIZATION_ID environment variable is required')
    }

    const startTime = Date.now()

    progressTracker.updateStepProgress(2, 10, 'Creating HappyScribe transcription job')

    const transcriptionId = await createTranscription(url, metadata.title, HAPPYSCRIBE_API_KEY, HAPPYSCRIBE_ORGANIZATION_ID)

    progressTracker.updateStepProgress(2, 20, 'Waiting for transcription to complete')

    await pollTranscriptionStatus(transcriptionId, HAPPYSCRIBE_API_KEY, progressTracker)

    progressTracker.updateStepProgress(2, 70, 'Creating export')

    const exportId = await createExport(transcriptionId, HAPPYSCRIBE_API_KEY)

    progressTracker.updateStepProgress(2, 80, 'Waiting for export')

    const downloadUrl = await pollExportStatus(exportId, HAPPYSCRIBE_API_KEY)

    progressTracker.updateStepProgress(2, 90, 'Downloading transcription')

    const transcriptJson = await downloadTranscript(downloadUrl)

    progressTracker.updateStepProgress(2, 95, 'Parsing transcription')

    const transcription = parseHappyScribeOutput(transcriptJson)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const outputPath = `${options.outputDir}/transcription.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    progressTracker.completeStep(2, 'Transcription complete')

    const step2Metadata: Step2Metadata = {
      transcriptionService: 'happyscribe',
      transcriptionModel: model,
      processingTime,
      tokenCount
    }

    l('HappyScribe transcription completed', {
      processingTimeMs: processingTime,
      tokenCount,
      transcriptLength: transcription.text.length,
      segmentCount: transcription.segments.length,
      outputPath
    })

    return {
      result: transcription,
      metadata: step2Metadata
    }
  } catch (error) {
    err('Failed to transcribe with HappyScribe', error)
    progressTracker.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

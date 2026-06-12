import type { IProgressTracker,ProcessingOptions,Step2Metadata,TranscriptionResult,VideoMetadata } from '~/types'
import { calculateActualCostUsd,countTokens,formatTranscriptOutput } from '../transcription-helpers'
import { createExport,pollExportStatus } from './create-export'
import { createTranscription,pollTranscriptionStatus } from './create-transcription'
import { parseHappyScribeOutput } from './parse-happyscribe-output'

const downloadTranscript = async (downloadUrl: string): Promise<string> => {
  const response = await fetch(downloadUrl)

  if (!response.ok) {
    throw new Error(`Failed to download transcript: ${response.statusText}`)
  }

  const transcriptJson = await response.text()

  return transcriptJson
}

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
      progressTracker.error(2, 'Configuration error', 'HAPPYSCRIBE_API_KEY environment variable is required')
      throw new Error('HAPPYSCRIBE_API_KEY environment variable is required')
    }

    if (!HAPPYSCRIBE_ORGANIZATION_ID) {
      progressTracker.error(2, 'Configuration error', 'HAPPYSCRIBE_ORGANIZATION_ID environment variable is required')
      throw new Error('HAPPYSCRIBE_ORGANIZATION_ID environment variable is required')
    }

    const startTime = Date.now()

    progressTracker.updateStepProgress(2, 10, 'Creating HappyScribe transcription job')

    const transcriptionId = await createTranscription(url, metadata.title, HAPPYSCRIBE_API_KEY, HAPPYSCRIBE_ORGANIZATION_ID)

    progressTracker.updateStepProgress(2, 20, 'Waiting for transcription to complete')

    const pollResult = await pollTranscriptionStatus(transcriptionId, HAPPYSCRIBE_API_KEY, progressTracker)

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

    const actualCostUsd = calculateActualCostUsd('happyscribe', model, pollResult.audioLengthInSeconds)

    const step2Metadata: Step2Metadata = {
      transcriptionService: 'happyscribe',
      transcriptionModel: model,
      processingTime,
      tokenCount,
      ...(pollResult.costInCents != null ? { totalCost: pollResult.costInCents } : {}),
      ...(actualCostUsd != null ? { actualCostUsd } : {})
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

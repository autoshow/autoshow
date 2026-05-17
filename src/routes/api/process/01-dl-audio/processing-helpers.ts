import { computeFinalCost } from '~/utils/cost/final-cost'
import type { CompletedPipelineResult,PipelineParams,ProcessingMetadata } from '~/types'
import { getShowNoteOutputDir } from '~/utils/artifact-paths'
import { runWriteAndTtsStage } from '../03-write-and-tts'
import { runMediaStage } from '../04-run-media'

export const runPostTranscriptionPipeline = async (params: PipelineParams): Promise<CompletedPipelineResult> => {
  const {
    showNoteId,
    jobId,
    metadata,
    step1Metadata,
    transcriptionResult,
    processingOptions,
    progressTracker,
    backupMetadata
  } = params

  progressTracker.startStep(3, 'Recording output selection')
  progressTracker.completeStep(3, 'Output selection recorded')

  const processingMetadata: ProcessingMetadata = {
    step1: step1Metadata,
    step2: transcriptionResult.metadata,
    ...(backupMetadata && { backup: backupMetadata })
  }

  const writeAndTtsResult = await runWriteAndTtsStage(
    metadata,
    transcriptionResult.result,
    processingOptions,
    progressTracker,
    jobId
  )

  processingMetadata.step3 = writeAndTtsResult.metadata

  const mediaMetadata = await runMediaStage(
    metadata,
    transcriptionResult.result,
    processingOptions,
    progressTracker,
    jobId
  )

  if (mediaMetadata) {
    processingMetadata.step4 = mediaMetadata
  }

  const transcriptionPath = `${processingOptions.outputDir}/transcription.txt`
  const transcriptionExists = (await Bun.$`test -e ${transcriptionPath}`.quiet().nothrow()).exitCode === 0
  if (!transcriptionExists) {
    throw new Error('Transcription file not found')
  }
  const transcriptionText = await Bun.file(transcriptionPath).text()

  const metadataPath = `${processingOptions.outputDir}/metadata.json`
  await Bun.write(metadataPath, JSON.stringify(processingMetadata, null, 2))

  const finalCostUsd = computeFinalCost(processingOptions, processingMetadata)

  return {
    showNoteId,
    metadata,
    processingMetadata,
    promptInstructions: writeAndTtsResult.promptInstructions,
    textOutput: writeAndTtsResult.textOutput,
    transcriptionText,
    finalCostUsd
  }
}

const generateShowNoteId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export const createOutputDirectory = async (): Promise<{ showNoteId: string, outputDir: string }> => {
  const showNoteId = generateShowNoteId()
  const outputDir = getShowNoteOutputDir(showNoteId)
  const { exitCode } = await Bun.$`mkdir -p ${outputDir}`.quiet()
  if (exitCode !== 0) throw new Error(`Failed to create directory: ${outputDir}`)

  return { showNoteId, outputDir }
}

import type { ProcessingMetadata, PipelineParams, ProcessingOptions } from '~/types'
import { l, err } from '~/utils/logging'
import { createShowNote } from '~/database/notes/create-show-note'
import { getDatabase, initializeSchema } from '~/database/db'
import { processLLMGeneration } from '../04-run-llm/run-llm'
import { processTTS } from '../05-run-tts/run-tts'
import { processImageGeneration } from '../06-run-image/run-image'
import { processMusicGeneration } from '../07-run-music/run-music'
import { processVideoGeneration } from '../08-run-video/run-video'

const saveResults = async (
  showNoteId: string,
  metadata: { url: string, title: string, author?: string, duration?: string },
  options: ProcessingOptions,
  processingMetadata: ProcessingMetadata,
  promptInstructions: string
): Promise<void> => {
  try {
    const db = getDatabase()
    await initializeSchema(db)

    const textOutputPath = `${options.outputDir}/text-output.json`
    const transcriptionPath = `${options.outputDir}/transcription.txt`

    const textOutputExists = (await Bun.$`test -e ${textOutputPath}`.quiet().nothrow()).exitCode === 0
    const transcriptionExists = (await Bun.$`test -e ${transcriptionPath}`.quiet().nothrow()).exitCode === 0

    if (!textOutputExists) {
      err(`Text output file not found: ${textOutputPath}`)
      throw new Error('Text output file not found')
    }

    if (!transcriptionExists) {
      err(`Transcription file not found: ${transcriptionPath}`)
      throw new Error('Transcription file not found')
    }

    const textOutput = await Bun.file(textOutputPath).text()
    const transcriptionText = await Bun.file(transcriptionPath).text()

    await createShowNote(db, showNoteId, metadata, options, processingMetadata, promptInstructions, textOutput, transcriptionText)

  } catch (error) {
    err('Failed to save results to database', error)
    throw error
  }
}

export const runPostTranscriptionPipeline = async (params: PipelineParams): Promise<string> => {
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

  l('Step 3: Select Prompts', { selectedPrompts: processingOptions.selectedPrompts })
  progressTracker.startStep(3, 'Selecting content prompts')
  progressTracker.completeStep(3, 'Content prompts selected')

  const llmResult = await processLLMGeneration(metadata, transcriptionResult.result, processingOptions, progressTracker)

  const processingMetadata: ProcessingMetadata = {
    step1: step1Metadata,
    step2: transcriptionResult.metadata,
    step3: { selectedPrompts: processingOptions.selectedPrompts },
    step4: llmResult.metadata,
    ...(backupMetadata && { backup: backupMetadata })
  }

  const step5Metadata = await processTTS(processingOptions, progressTracker, jobId)
  if (step5Metadata) {
    processingMetadata.step5 = step5Metadata
  }

  const step6Metadata = await processImageGeneration(metadata, processingOptions, progressTracker, jobId)
  if (step6Metadata) {
    processingMetadata.step6 = step6Metadata
  }

  const step7Metadata = await processMusicGeneration(metadata, transcriptionResult.result, processingOptions, progressTracker, jobId)
  if (step7Metadata) {
    processingMetadata.step7 = step7Metadata
  }

  const step8Metadata = await processVideoGeneration(metadata, transcriptionResult.result, processingOptions, progressTracker, jobId)
  if (step8Metadata) {
    processingMetadata.step8 = step8Metadata
  }

  const metadataPath = `${processingOptions.outputDir}/metadata.json`
  await Bun.write(metadataPath, JSON.stringify(processingMetadata, null, 2))
  await saveResults(showNoteId, metadata, processingOptions, processingMetadata, llmResult.promptInstructions)

  l('Processing finalized', {
    showNoteId,
    title: metadata.title,
    outputDir: processingOptions.outputDir,
    hasStep5: !!processingMetadata.step5,
    hasStep6: !!processingMetadata.step6,
    hasStep7: !!processingMetadata.step7,
    hasStep8: !!processingMetadata.step8,
    ...(backupMetadata && { hasBackup: true })
  })

  return showNoteId
}

export const createOutputDirectory = async (): Promise<{ showNoteId: string, outputDir: string }> => {
  const showNoteId = Date.now().toString()
  const outputDir = `./output/${showNoteId}`
  const { exitCode } = await Bun.$`mkdir -p ${outputDir}`.quiet()
  if (exitCode !== 0) throw new Error(`Failed to create directory: ${outputDir}`)

  l('Created output directory', { showNoteId, outputDir })

  return { showNoteId, outputDir }
}

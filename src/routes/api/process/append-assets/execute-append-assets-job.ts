import type { SQL } from "bun"
import { completeJob,failJob,updateJobProgress } from "~/database/jobs/update-job"
import { insertShowNoteAsset } from "~/database/notes/show-note-assets"
import { runImmediateTransaction } from "~/database/transaction"
import { ProcessJobProgressTracker } from "~/routes/api/process/01-dl-audio/process-job/progress-tracker"
import { processLLMGeneration } from "~/routes/api/process/03-write-and-tts/run-llm/run-llm"
import { processTTS } from "~/routes/api/process/03-write-and-tts/run-tts/run-tts"
import { runMediaStage } from "~/routes/api/process/04-run-media"
import { buildSequentialProgressRanges,createRangedProgressTracker } from "~/routes/api/process/shared/ranged-progress-tracker"
import type {
AppendAssetsJobInput,
ProcessingOptions,
ShowNote,
StructuredLLMResponse,
TranscriptionResult,
VideoMetadata
} from "~/types"
import { getAppendAssetRelativePath,getAppendAssetsOutputDir,getShowNoteOutputDir } from "~/utils/artifact-paths"
import { JOB_PROGRESS_STEP_NUMBERS,getJobProgressStepName } from "~/utils/job-progress"
import { err,l } from "~/utils/logger/logging"
import {
computeAppendAssetsCost,
type AppendAssetsMetadata
} from "../form-helpers/append-assets"

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

const loadShowNote = async (
  db: SQL,
  showNoteId: string
): Promise<ShowNote> => {
  const rows = await db`
    SELECT *
    FROM show_notes
    WHERE id = ${showNoteId}
      AND deleted_at IS NULL
    LIMIT 1
  `
  const row = rows[0] as ShowNote | undefined
  if (!row) {
    throw new Error('Show note not found')
  }

  return row
}

const buildVideoMetadata = (note: ShowNote): VideoMetadata => ({
  title: note.title,
  duration: note.duration ?? '',
  author: note.author ?? '',
  description: '',
  url: note.url,
  publishDate: note.video_publish_date ?? undefined,
  thumbnail: note.video_thumbnail ?? undefined,
  channelUrl: note.channel_url ?? undefined,
})

const buildTranscriptionResult = (note: ShowNote): TranscriptionResult => ({
  text: note.transcription,
  segments: [{
    start: '00:00',
    end: '00:00',
    text: note.transcription
  }]
})

const normalizeTextOutputJson = (textOutput: string): string => {
  try {
    return JSON.stringify(JSON.parse(textOutput), null, 2)
  } catch {
    return JSON.stringify({ text: textOutput }, null, 2)
  }
}

const parseTextOutput = (textOutput: string | null): StructuredLLMResponse | string | null => {
  if (!textOutput) return null
  try {
    return JSON.parse(textOutput) as StructuredLLMResponse
  } catch {
    return textOutput
  }
}

const getTextOutputFromAssetMetadata = (metadataJson: string | null): string | null => {
  if (!metadataJson) return null

  try {
    const metadata = JSON.parse(metadataJson) as unknown
    if (!isRecord(metadata) || !('textOutput' in metadata)) {
      return null
    }

    const textOutput = metadata.textOutput
    if (typeof textOutput === 'string') {
      return normalizeTextOutputJson(textOutput)
    }

    if (textOutput != null) {
      return JSON.stringify(textOutput, null, 2)
    }
  } catch {
  }

  return null
}

export const loadLatestTextOutputForAppend = async (
  db: SQL,
  note: ShowNote
): Promise<string | null> => {
  const assetRows = await db`
    SELECT file_path, metadata_json
    FROM show_note_assets
    WHERE show_note_id = ${note.id}
      AND kind = 'llm'
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `

  const asset = assetRows[0] as { file_path: string | null; metadata_json: string | null } | undefined
  const metadataTextOutput = asset ? getTextOutputFromAssetMetadata(asset.metadata_json) : null
  if (metadataTextOutput) {
    return metadataTextOutput
  }

  if (asset?.file_path) {
    const filePath = `${getShowNoteOutputDir(note.id)}/${asset.file_path}`
    const file = Bun.file(filePath)
    if (await file.exists()) {
      return normalizeTextOutputJson(await file.text())
    }
  }

  return note.text_output ? normalizeTextOutputJson(note.text_output) : null
}

export const hasTextOutputForAppend = async (
  db: SQL,
  note: ShowNote
): Promise<boolean> => {
  if (note.text_output?.trim()) {
    return true
  }

  const rows = await db`
    SELECT id
    FROM show_note_assets
    WHERE show_note_id = ${note.id}
      AND kind = 'llm'
    LIMIT 1
  `

  return rows.length > 0
}

const createAppendOutputDirectory = async (
  showNoteId: string,
  jobId: string
): Promise<string> => {
  const outputDir = getAppendAssetsOutputDir(showNoteId, jobId)
  const { exitCode } = await Bun.$`mkdir -p ${outputDir}`.quiet()
  if (exitCode !== 0) {
    throw new Error(`Failed to create append asset directory: ${outputDir}`)
  }

  return outputDir
}

const writeSourceFiles = async (
  outputDir: string,
  note: ShowNote
): Promise<void> => {
  await Bun.write(`${outputDir}/transcription.txt`, note.transcription)
}

const runAppendWriteStage = async (
  db: SQL,
  note: ShowNote,
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker: ProcessJobProgressTracker,
  jobId: string
): Promise<AppendAssetsMetadata> => {
  const stageMetadata: AppendAssetsMetadata = {}
  const writeTaskCount = (options.llmEnabled ? 1 : 0) + (options.ttsEnabled ? 1 : 0)

  if (writeTaskCount === 0) {
    progressTracker.skipStep(JOB_PROGRESS_STEP_NUMBERS.writeAndTts)
    return stageMetadata
  }

  const ranges = buildSequentialProgressRanges(JOB_PROGRESS_STEP_NUMBERS.writeAndTts, writeTaskCount)
  let rangeIndex = 0

  if (options.llmEnabled) {
    progressTracker.startStep(JOB_PROGRESS_STEP_NUMBERS.writeAndTts, 'Running LLM...')
    const llmTracker = createRangedProgressTracker(progressTracker, ranges[rangeIndex++]!)
    const llmResult = await processLLMGeneration(metadata, transcription, options, llmTracker)
    stageMetadata.llm = llmResult.metadata
  }

  if (options.ttsEnabled) {
    if (!options.llmEnabled) {
      const latestTextOutput = await loadLatestTextOutputForAppend(db, note)
      if (!latestTextOutput) {
        throw new Error('TTS requires an existing text output or a new LLM output in this append run')
      }
      await Bun.write(`${options.outputDir}/text-output.json`, latestTextOutput)
    }

    progressTracker.updateStepProgress(JOB_PROGRESS_STEP_NUMBERS.writeAndTts, ranges[rangeIndex]?.start ?? 0, 'Running TTS...')
    const ttsTracker = createRangedProgressTracker(progressTracker, ranges[rangeIndex++]!)
    const ttsMetadata = await processTTS(options, ttsTracker, jobId)
    if (ttsMetadata) {
      stageMetadata.tts = ttsMetadata
    }
  }

  progressTracker.completeStep(JOB_PROGRESS_STEP_NUMBERS.writeAndTts, 'Write and TTS complete')
  return stageMetadata
}

const readGeneratedTextOutput = async (outputDir: string): Promise<string | null> => {
  const path = `${outputDir}/text-output.json`
  const file = Bun.file(path)
  if (!(await file.exists())) {
    return null
  }

  return file.text()
}

const insertGeneratedAssetRows = async (
  db: SQL,
  showNoteId: string,
  jobId: string,
  outputDir: string,
  options: ProcessingOptions,
  metadata: AppendAssetsMetadata
): Promise<void> => {
  const createdAt = Date.now()

  if (metadata.llm) {
    const textOutput = await readGeneratedTextOutput(outputDir)
    await insertShowNoteAsset(db, {
      showNoteId,
      jobId,
      kind: 'llm',
      service: metadata.llm.llmService,
      model: metadata.llm.llmModel,
      filePath: getAppendAssetRelativePath(jobId, 'text-output.json'),
      metadata: {
        ...metadata.llm,
        selectedPrompts: options.selectedPrompts ?? [],
        textOutput: parseTextOutput(textOutput),
      },
      createdAt,
    })
  }

  if (metadata.tts) {
    await insertShowNoteAsset(db, {
      showNoteId,
      jobId,
      kind: 'tts',
      service: metadata.tts.ttsService,
      model: metadata.tts.ttsModel,
      filePath: getAppendAssetRelativePath(jobId, metadata.tts.audioFileName),
      metadata: metadata.tts,
      createdAt,
    })
  }

  for (const result of metadata.image?.results ?? []) {
    await insertShowNoteAsset(db, {
      showNoteId,
      jobId,
      kind: 'image',
      service: metadata.image?.imageGenService ?? null,
      model: metadata.image?.imageGenModel ?? null,
      filePath: getAppendAssetRelativePath(jobId, result.fileName),
      metadata: {
        ...metadata.image,
        result,
        promptType: result.promptType,
      },
      createdAt,
    })
  }

  if (metadata.music) {
    await insertShowNoteAsset(db, {
      showNoteId,
      jobId,
      kind: 'music',
      service: metadata.music.musicService,
      model: metadata.music.musicModel,
      filePath: getAppendAssetRelativePath(jobId, metadata.music.musicFileName),
      metadata: metadata.music,
      createdAt,
    })
  }

  for (const result of metadata.video?.results ?? []) {
    await insertShowNoteAsset(db, {
      showNoteId,
      jobId,
      kind: 'video',
      service: metadata.video?.videoGenService ?? null,
      model: metadata.video?.videoGenModel ?? null,
      filePath: getAppendAssetRelativePath(jobId, result.fileName),
      thumbnailFilePath: result.thumbnailFileName
        ? getAppendAssetRelativePath(jobId, result.thumbnailFileName)
        : null,
      metadata: {
        ...metadata.video,
        result,
        promptType: result.promptType,
      },
      createdAt,
    })
  }
}

const finalizeAppendJob = async (
  db: SQL,
  jobId: string,
  input: AppendAssetsJobInput,
  outputDir: string,
  metadata: AppendAssetsMetadata
): Promise<void> => {
  const finalCostUsd = computeAppendAssetsCost(input, metadata)
  const now = Date.now()

  await runImmediateTransaction(db, async () => {
    await insertGeneratedAssetRows(db, input.showNoteId, jobId, outputDir, input, metadata)

    await db`
      UPDATE show_notes
      SET total_cost_usd = COALESCE(total_cost_usd, 0) + ${finalCostUsd},
          processed_at = ${now}
      WHERE id = ${input.showNoteId}
        AND deleted_at IS NULL
    `

    await completeJob(db, jobId, input.showNoteId)
  })
}

export const executeAppendAssetsJob = async (
  db: SQL,
  jobId: string,
  input: AppendAssetsJobInput
): Promise<void> => {
  try {
    const note = await loadShowNote(db, input.showNoteId)
    const outputDir = await createAppendOutputDirectory(input.showNoteId, jobId)
    await writeSourceFiles(outputDir, note)

    await updateJobProgress(db, jobId, {
      status: 'processing',
      startedAt: Date.now(),
      currentStep: JOB_PROGRESS_STEP_NUMBERS.writeAndTts,
      stepName: getJobProgressStepName(JOB_PROGRESS_STEP_NUMBERS.writeAndTts) ?? 'Write and TTS',
      stepProgress: 0,
      overallProgress: 55,
      message: 'Preparing append asset generation',
      updatedAt: Date.now(),
    })

    const progressTracker = new ProcessJobProgressTracker(db, jobId)
    const processingOptions: ProcessingOptions = {
      ...input,
      outputDir,
    }
    const videoMetadata = buildVideoMetadata(note)
    const transcription = buildTranscriptionResult(note)

    const appendMetadata = await runAppendWriteStage(
      db,
      note,
      videoMetadata,
      transcription,
      processingOptions,
      progressTracker,
      jobId
    )

    const mediaMetadata = await runMediaStage(
      videoMetadata,
      transcription,
      processingOptions,
      progressTracker,
      jobId
    )

    if (mediaMetadata?.image) appendMetadata.image = mediaMetadata.image
    if (mediaMetadata?.music) appendMetadata.music = mediaMetadata.music
    if (mediaMetadata?.video) appendMetadata.video = mediaMetadata.video

    await finalizeAppendJob(db, jobId, input, outputDir, appendMetadata)

    l('Append assets job completed successfully', { jobId, showNoteId: input.showNoteId })
  } catch (error) {
    err(`Append assets job ${jobId} failed`, error)
    await failJob(db, jobId, error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

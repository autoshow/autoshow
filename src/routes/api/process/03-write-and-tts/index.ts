import type {
IProgressTracker,
ProcessingOptions,
TranscriptionResult,
VideoMetadata,SourceRoutesApiProcess03WriteAndTtsIndexWriteAndTtsStageResult as WriteAndTtsStageResult,WriteMode
} from '~/types'
import { JOB_PROGRESS_STEP_NUMBERS } from '~/utils/job-progress'
import { buildSequentialProgressRanges,createRangedProgressTracker } from '../shared/ranged-progress-tracker'
import { processLLMGeneration } from './run-llm/run-llm'
import { processTTS } from './run-tts/run-tts'

const resolveWriteMode = (options: ProcessingOptions): WriteMode => {
  if (!options.llmEnabled) {
    return 'skip'
  }

  return options.ttsEnabled ? 'write+tts' : 'write'
}

const loadTextOutput = async (outputDir: string): Promise<string | null> => {
  const textOutputPath = `${outputDir}/text-output.json`
  const textOutputExists = (await Bun.$`test -e ${textOutputPath}`.quiet().nothrow()).exitCode === 0
  if (!textOutputExists) {
    return null
  }

  return Bun.file(textOutputPath).text()
}

export const runWriteAndTtsStage = async (
  metadata: VideoMetadata,
  transcriptionResult: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  jobId?: string
): Promise<WriteAndTtsStageResult> => {
  const mode = resolveWriteMode(options)

  if (mode === 'skip') {
    progressTracker.skipStep(JOB_PROGRESS_STEP_NUMBERS.writeAndTts)
    return {
      metadata: { mode },
      promptInstructions: '',
      textOutput: null,
    }
  }

  const segments = buildSequentialProgressRanges(
    JOB_PROGRESS_STEP_NUMBERS.writeAndTts,
    mode === 'write+tts' ? 2 : 1
  )
  const llmTracker = createRangedProgressTracker(progressTracker, segments[0]!)

  progressTracker.startStep(JOB_PROGRESS_STEP_NUMBERS.writeAndTts, 'Running LLM...')
  const llmResult = await processLLMGeneration(
    metadata,
    transcriptionResult,
    options,
    llmTracker
  )

  const textOutput = await loadTextOutput(options.outputDir)

  if (mode === 'write') {
    progressTracker.completeStep(JOB_PROGRESS_STEP_NUMBERS.writeAndTts, 'Write and TTS complete')
    return {
      metadata: {
        mode,
        llm: llmResult.metadata,
      },
      promptInstructions: llmResult.promptInstructions,
      textOutput,
    }
  }

  progressTracker.updateStepProgress(JOB_PROGRESS_STEP_NUMBERS.writeAndTts, segments[0]!.end, 'Running TTS...')
  const ttsTracker = createRangedProgressTracker(progressTracker, segments[1]!)
  const ttsMetadata = await processTTS(options, ttsTracker, jobId)

  progressTracker.completeStep(JOB_PROGRESS_STEP_NUMBERS.writeAndTts, 'Write and TTS complete')

  return {
    metadata: {
      mode,
      llm: llmResult.metadata,
      ...(ttsMetadata && { tts: ttsMetadata }),
    },
    promptInstructions: llmResult.promptInstructions,
    textOutput,
  }
}

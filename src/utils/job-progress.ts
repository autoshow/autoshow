import type { SourceUtilsJobProgressJobProgressStage as JobProgressStage,SourceUtilsJobProgressJobProgressStepNumber as JobProgressStepNumber,SourceUtilsJobProgressJobProgressTimingKey as JobProgressTimingKey } from '~/types'
const getJobProgressStage = (step: number): JobProgressStage | null => {
  return JOB_PROGRESS_STAGE_BY_STEP[step as JobProgressStepNumber] ?? null
}

export const JOB_PROGRESS_STEP_NUMBERS = {
  downloadAudio: 1,
  transcription: 2,
  writeAndTts: 3,
  media: 4,
} as const

const JOB_PROGRESS_STAGES = [
  {
    step: JOB_PROGRESS_STEP_NUMBERS.downloadAudio,
    name: 'Download Audio',
    weight: 15,
    timingKey: 'download',
  },
  {
    step: JOB_PROGRESS_STEP_NUMBERS.transcription,
    name: 'Extract Text',
    weight: 40,
    timingKey: 'transcription',
  },
  {
    step: JOB_PROGRESS_STEP_NUMBERS.writeAndTts,
    name: 'Write and TTS',
    weight: 20,
    timingKey: 'writeAndTts',
  },
  {
    step: JOB_PROGRESS_STEP_NUMBERS.media,
    name: 'Image, Video, and Music',
    weight: 25,
    timingKey: 'media',
  },
] as const satisfies readonly JobProgressStage[]

export const JOB_PROGRESS_DISPLAY_STEPS = JOB_PROGRESS_STAGES.map(({ step, name }) => ({
  number: step,
  name,
}))

export const JOB_PROGRESS_STEP_NAMES = JOB_PROGRESS_STAGES.map((stage) => stage.name)

export const JOB_PROGRESS_STEP_WEIGHTS = JOB_PROGRESS_STAGES.map((stage) => stage.weight)

const JOB_PROGRESS_STEP_NAME_TO_TIMING_KEY: Readonly<Record<string, JobProgressTimingKey>> = {
  ...Object.fromEntries(
    JOB_PROGRESS_STAGES.map((stage) => [stage.name, stage.timingKey] as const)
  ),
  Transcription: 'transcription',
  'Output Selection': 'contentSelection',
  'Content Selection': 'contentSelection',
  'LLM Generation': 'llm',
  'Text-to-Speech': 'tts',
  'Image Generation': 'image',
  'Music Generation': 'music',
  'Video Generation': 'video',
}

const JOB_PROGRESS_STAGE_BY_STEP: Readonly<Record<JobProgressStepNumber, JobProgressStage>> =
  Object.fromEntries(JOB_PROGRESS_STAGES.map((stage) => [stage.step, stage])) as Record<
    JobProgressStepNumber,
    JobProgressStage
  >
export const getJobProgressStepName = (step: number): string | null => {
  return getJobProgressStage(step)?.name ?? null
}

export const getJobProgressTimingKey = (
  stepName: string | null | undefined
): JobProgressTimingKey | null => {
  if (!stepName) {
    return null
  }

  return JOB_PROGRESS_STEP_NAME_TO_TIMING_KEY[stepName] ?? null
}

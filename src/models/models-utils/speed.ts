import type { SpeedOperation,SpeedOperationProfile,SpeedProfile,SourceModelsModelsUtilsSpeedSpeedRank as SpeedRank } from '~/types'

const RANKED_LLM_BASE_MS: Record<SpeedRank, number> = {
  A: 3_000,
  B: 6_000,
  C: 14_000
}

const RANKED_DOCUMENT_PER_PAGE_MS: Record<SpeedRank, number> = {
  A: 2_500,
  B: 3_500,
  C: 5_500
}

const RANKED_TTS_BASE_MS: Record<SpeedRank, number> = {
  A: 4_000,
  B: 6_000,
  C: 8_000
}

const DEFAULT_OPERATION_THRESHOLDS_MS: Record<SpeedOperation, [number, number]> = {
  transcription: [700, 1_050],
  llm: [4_000, 9_000],
  document: [17_000, 24_000],
  tts: [4_000, 6_000],
  image: [10_000, 25_000],
  music: [15_000, 50_000],
  video: [60_000, 120_000]
}

const DEFAULT_OPERATION_WORKLOAD: Record<SpeedOperation, number> = {
  transcription: 1,
  llm: 1,
  document: 5,
  tts: 1,
  image: 1,
  music: 60,
  video: 5
}

const SPEED_OPERATION_ORDER: SpeedOperation[] = [
  'transcription',
  'llm',
  'document',
  'tts',
  'image',
  'music',
  'video'
]

function withOverrides(
  base: SpeedOperationProfile,
  overrides?: Partial<SpeedOperationProfile>
): SpeedOperationProfile {
  return {
    ...base,
    ...overrides
  }
}

export function createTranscriptionSpeedProfile(
  secondsPerInputMinute: number,
  overrides?: Partial<SpeedOperationProfile>
): SpeedProfile {
  return {
    transcription: withOverrides({
      baseMs: 0,
      perInputMinuteMs: Math.round(secondsPerInputMinute * 1000)
    }, overrides)
  }
}

export function createLLMSpeedProfile(
  rank: SpeedRank,
  overrides?: {
    llm?: Partial<SpeedOperationProfile>
    document?: Partial<SpeedOperationProfile>
  }
): SpeedProfile {
  return {
    llm: withOverrides({
      baseMs: RANKED_LLM_BASE_MS[rank]
    }, overrides?.llm),
    document: withOverrides({
      baseMs: 2_500,
      perPageMs: RANKED_DOCUMENT_PER_PAGE_MS[rank]
    }, overrides?.document)
  }
}

export function createDocumentSpeedProfile(
  rank: SpeedRank,
  overrides?: Partial<SpeedOperationProfile>
): SpeedProfile {
  return {
    document: withOverrides({
      baseMs: 2_500,
      perPageMs: RANKED_DOCUMENT_PER_PAGE_MS[rank]
    }, overrides)
  }
}

export function createTTSSpeedProfile(
  rank: SpeedRank,
  overrides?: Partial<SpeedOperationProfile>
): SpeedProfile {
  return {
    tts: withOverrides({
      baseMs: RANKED_TTS_BASE_MS[rank]
    }, overrides)
  }
}

export function createImageSpeedProfile(
  baseMs: number,
  overrides?: Partial<SpeedOperationProfile>
): SpeedProfile {
  return {
    image: withOverrides({
      baseMs
    }, overrides)
  }
}

export function createMusicSpeedProfile(
  baseMs: number,
  perOutputSecondMs: number,
  overrides?: Partial<SpeedOperationProfile>
): SpeedProfile {
  return {
    music: withOverrides({
      baseMs,
      perOutputSecondMs
    }, overrides)
  }
}

export function createVideoSpeedProfile(
  perOutputSecondMs: number,
  overrides?: Partial<SpeedOperationProfile>
): SpeedProfile {
  return {
    video: withOverrides({
      baseMs: 0,
      perOutputSecondMs
    }, overrides)
  }
}

function getPrimarySpeedOperation(profile: SpeedProfile): SpeedOperation | undefined {
  return SPEED_OPERATION_ORDER.find(operation => profile[operation] != null)
}

export function getSpeedScoreMs(
  profile: SpeedProfile,
  operation?: SpeedOperation
): number | undefined {
  const resolvedOperation = operation ?? getPrimarySpeedOperation(profile)
  if (!resolvedOperation) {
    return undefined
  }

  const timing = profile[resolvedOperation]
  if (!timing) {
    return undefined
  }

  const workload = DEFAULT_OPERATION_WORKLOAD[resolvedOperation]

  return timing.baseMs
    + ((timing.perInputMinuteMs ?? 0) * workload)
    + ((timing.perPageMs ?? 0) * workload)
    + ((timing.perOutputSecondMs ?? 0) * workload)
    + ((timing.perCharacterMs ?? 0) * workload)
}

export function deriveSpeedLabel(
  profile: SpeedProfile,
  operation?: SpeedOperation
): SpeedRank | undefined {
  const resolvedOperation = operation ?? getPrimarySpeedOperation(profile)
  const score = getSpeedScoreMs(profile, resolvedOperation)
  if (resolvedOperation == null || score == null) {
    return undefined
  }

  const [fastThreshold, balancedThreshold] = DEFAULT_OPERATION_THRESHOLDS_MS[resolvedOperation]

  if (score <= fastThreshold) {
    return 'A'
  }

  if (score <= balancedThreshold) {
    return 'B'
  }

  return 'C'
}

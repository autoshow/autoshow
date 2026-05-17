import { getTranscriptionModelConfig } from '~/models/models-config/transcription-config'
import type { TranscriptionSegment } from '~/types'
import { calculateAudioDuration } from '~/utils/audio'

export const countTokens = (text: string): number => {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

export const formatTimestamp = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export const adjustTimestamp = (timestamp: string, offsetMinutes: number): string => {
  if (offsetMinutes === 0) return timestamp

  const parts = timestamp.split(':')
  if (parts.length < 2) return timestamp

  const hours = parseInt(parts[0] || '0', 10)
  const minutes = parseInt(parts[1] || '0', 10) + offsetMinutes
  const seconds = parts.slice(2).join(':')

  const newHours = hours + Math.floor(minutes / 60)
  const newMinutes = minutes % 60

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${seconds}`
}

/**
 * Calculate actual USD cost from audio duration and model pricing.
 * Returns undefined if durationSeconds is null/undefined.
 */
export const calculateActualCostUsd = (
  service: string,
  model: string,
  durationSeconds: number | null | undefined
): number | undefined => {
  if (durationSeconds == null) return undefined
  const durationMinutes = durationSeconds / 60
  const modelConfig = getTranscriptionModelConfig(service, model)
  const rate = modelConfig?.centicentsPerMin ?? 100
  const billedCenticents = Math.ceil(durationMinutes * rate)
  return billedCenticents / 10_000
}

export const resolveTranscriptionDurationSeconds = async (
  providerDurationSeconds: number | null | undefined,
  audioPath?: string,
): Promise<number | undefined> => {
  if (providerDurationSeconds != null && Number.isFinite(providerDurationSeconds) && providerDurationSeconds > 0) {
    return providerDurationSeconds
  }

  if (!audioPath) {
    return undefined
  }

  const localDurationSeconds = await calculateAudioDuration(audioPath)
  return localDurationSeconds > 0 ? localDurationSeconds : undefined
}

export const formatTranscriptOutput = (segments: TranscriptionSegment[]): string => {
  return segments
    .map(seg => {
      const speakerPrefix = seg.speaker ? `[${seg.speaker}] ` : ''
      return `[${seg.start}] ${speakerPrefix}${seg.text}`
    })
    .join('\n')
}

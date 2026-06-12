import type { CostBreakdown,FinalCostBreakdown,ProcessingMetadata,ProcessingOptions } from '~/types'
import {
getImageProcessingMetadata,
getLlmProcessingMetadata,
getMusicProcessingMetadata,
getTtsProcessingMetadata,
getVideoProcessingMetadata,
} from '~/types'
import { TTS_PLACEHOLDER_COST_USD } from '~/utils/cost-helpers'
import { estimateCostBreakdown } from './cost-estimation'

const getStep2ActualCostUsd = (processingMetadata: ProcessingMetadata): number | undefined => {
  const step2 = processingMetadata.step2 as { actualCostUsd?: number }
  return step2.actualCostUsd
}

const getEstimatedTtsFallbackCostUsd = (
  options: ProcessingOptions,
  estimated: CostBreakdown
): number => {
  if (estimated.tts > 0) {
    return estimated.tts
  }

  return options.ttsEnabled ? TTS_PLACEHOLDER_COST_USD : 0
}

export const computeFinalCostBreakdown = (
  options: ProcessingOptions,
  processingMetadata: ProcessingMetadata
): FinalCostBreakdown => {
  const estimated = estimateCostBreakdown(options)
  const step2Estimate = options.inputType === 'document' ? estimated.document : estimated.transcription

  const step2 = getStep2ActualCostUsd(processingMetadata) ?? step2Estimate
  const step4 = getLlmProcessingMetadata(processingMetadata)?.actualCostUsd ?? estimated.llm
  const step5 =
    getTtsProcessingMetadata(processingMetadata)?.actualCostUsd
    ?? getEstimatedTtsFallbackCostUsd(options, estimated)
  const step6 = getImageProcessingMetadata(processingMetadata)?.actualCostUsd ?? estimated.image
  const step7 = getMusicProcessingMetadata(processingMetadata)?.actualCostUsd ?? estimated.music
  const step8 = getVideoProcessingMetadata(processingMetadata)?.actualCostUsd ?? estimated.video
  const total = step2 + step4 + step5 + step6 + step7 + step8

  return {
    estimated,
    step2,
    step4,
    step5,
    step6,
    step7,
    step8,
    total
  }
}

export const computeFinalCost = (
  options: ProcessingOptions,
  processingMetadata: ProcessingMetadata
): number => {
  return computeFinalCostBreakdown(options, processingMetadata).total
}

import { estimateModelCostUsd } from "~/models/models-utils/estimate-cost"
import { findDocumentModel,findLLMModel } from "~/models/models-utils/model-lookup"
import { getSpeedScoreMs } from "~/models/models-utils/speed"
import type { SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate as CuratedModelCandidate,SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelChoices as CuratedModelChoices,DocumentExtractionServiceType,SourceRoutesCreateStepsComponentsSharedCuratedModelsIndexedCandidate as IndexedCandidate,SpeedOperation,SupportedDocumentType } from '~/types'

export type { SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate as CuratedModelCandidate } from '~/types'

const DEFAULT_DOCUMENT_PAGE_COUNT = 1

export const buildCandidateKey = (serviceId: string, modelId: string): string => {
  return `${serviceId}:${modelId}`
}

export function estimateDocumentModelCostScore(
  service: DocumentExtractionServiceType,
  modelId: string,
  documentType?: SupportedDocumentType | null
): number {
  const documentModel = findDocumentModel(service, modelId)
  if (!documentModel) {
    return Number.POSITIVE_INFINITY
  }

  return estimateModelCostUsd(documentModel.estimation, {
    documentPages: DEFAULT_DOCUMENT_PAGE_COUNT,
    documentType: documentType ?? "pdf"
  })
}

export function getDocumentModelQuality(
  service: DocumentExtractionServiceType,
  modelId: string
): string | undefined {
  const llmModel = findLLMModel(service, modelId)
  if (llmModel?.quality) return llmModel.quality
  return findDocumentModel(service, modelId)?.quality
}

function compareAscending<T extends CuratedModelCandidate>(
  left: IndexedCandidate<T>,
  right: IndexedCandidate<T>,
  selector: (value: T) => number
): number {
  const leftValue = selector(left.candidate)
  const rightValue = selector(right.candidate)

  if (leftValue === rightValue) {
    return left.index - right.index
  }

  return leftValue - rightValue
}

function compareDescending<T extends CuratedModelCandidate>(
  left: IndexedCandidate<T>,
  right: IndexedCandidate<T>,
  selector: (value: T) => number
): number {
  const leftValue = selector(left.candidate)
  const rightValue = selector(right.candidate)

  if (leftValue === rightValue) {
    return left.index - right.index
  }

  return rightValue - leftValue
}

export function getCuratedModelChoices<T extends CuratedModelCandidate>(
  candidates: T[],
  operation: SpeedOperation
): CuratedModelChoices<T> {
  if (candidates.length === 0) {
    throw new Error("Curated model picker requires at least one candidate")
  }

  const indexed = candidates.map((candidate, index) => ({ candidate, index }))

  const cheapest = [...indexed]
    .sort((left, right) => compareAscending(left, right, value => value.costScore))[0]!.candidate

  const fastest = [...indexed]
    .sort((left, right) => compareAscending(
      left,
      right,
      value => getSpeedScoreMs(value.speedProfile, operation) ?? Number.POSITIVE_INFINITY
    ))[0]!.candidate

  const highestQuality = [...indexed]
    .sort((left, right) => compareDescending(left, right, value => value.costScore))[0]!.candidate

  return {
    cheapest,
    fastest,
    highestQuality
  }
}

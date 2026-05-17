import type { SpeedProfile } from '~/types'
export type SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCategory = "cheapest" | "fastest" | "highestQuality"

export type SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate = {
  key: string
  serviceId: string
  serviceName: string
  modelId: string
  modelName: string
  description?: string | undefined
  speedProfile: SpeedProfile
  quality?: string | undefined
  costScore: number
}

export type SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelChoices<T extends SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate> = {
  cheapest: T
  fastest: T
  highestQuality: T
}

export type SourceRoutesCreateStepsComponentsSharedCuratedModelsIndexedCandidate<T extends SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate> = {
  candidate: T
  index: number
}

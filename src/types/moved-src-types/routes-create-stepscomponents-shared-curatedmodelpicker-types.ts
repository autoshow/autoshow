import type { JSX } from 'solid-js'
import type { SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate as CuratedModelCandidate,SpeedOperation } from '~/types'
export type SourceRoutesCreateStepsComponentsSharedCuratedModelPickerModelGridProps = {
  children: JSX.Element
}

export type SourceRoutesCreateStepsComponentsSharedCuratedModelPickerProps<T extends CuratedModelCandidate> = {
  candidates: T[]
  operation: SpeedOperation
  selectedKey: string
  selectionActive?: boolean | undefined
  modelInputName: string
  curatedInputName?: string | undefined
  disabled?: boolean | undefined
  onSelect: (candidate: T) => void
  getCostLabel?: ((candidate: T) => string | undefined) | undefined
  renderAddon?: ((candidate: T) => JSX.Element | undefined) | undefined
}

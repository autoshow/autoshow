import type { JSX } from 'solid-js'
import type { WizardStepId,WizardStepMeta } from '~/types'
export type SourceRoutesCreateStepsComponentsWizardProgressWizardAction = {
  label: string
  disabled?: boolean
  onClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>
}

export type SourceRoutesCreateStepsComponentsWizardProgressWizardPrimaryAction = {
  label: string
  disabled?: boolean
  type: "button" | "submit"
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>
}

export type SourceRoutesCreateStepsComponentsWizardProgressProps = {
  stepList: WizardStepId[]
  currentIndex: number
  stepMeta: Record<WizardStepId, WizardStepMeta>
  leftAction: SourceRoutesCreateStepsComponentsWizardProgressWizardAction | undefined
  rightAction: SourceRoutesCreateStepsComponentsWizardProgressWizardPrimaryAction
}

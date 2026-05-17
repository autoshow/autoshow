import type { JSX } from 'solid-js'
export type SourceRoutesCreateStepsComponentsSharedOptionButtonTogglePromptOptions = {
  current: () => string[]
  setter: (prompts: string[]) => void
  maxItems?: number | undefined
}

export type SourceRoutesCreateStepsComponentsSharedOptionButtonProps = {
  title: string
  description?: string | undefined
  selected: boolean
  disabled?: boolean | undefined
  onClick: () => void
  name?: string | undefined
  value?: string | undefined
  inputType?: "checkbox" | "radio" | undefined
  variant?: 'fancy' | 'simple' | undefined
  service?: string | undefined
  costLabel?: string | undefined
  children?: JSX.Element | undefined
}

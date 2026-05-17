import type { JSX } from 'solid-js'
export type SourceRoutesCreateStepsComponentsSharedModelButtonProps = {
  service: string
  title: string
  description?: string | undefined
  speedLabel?: string | undefined
  quality?: string | undefined
  costLabel?: string | undefined
  selected: boolean
  disabled?: boolean | undefined
  onClick: () => void
  name?: string | undefined
  value?: string | undefined
  children?: JSX.Element | undefined
}

import clsx from "clsx"
import type { SourceRoutesCreateStepsComponentsSharedOptionGridProps as Props } from '~/types'
import shared from "./shared.module.css"

export default function OptionGrid(props: Props) {
  return (
    <div class={clsx(shared.selectableGrid, props.class)}>
      {props.children}
    </div>
  )
}

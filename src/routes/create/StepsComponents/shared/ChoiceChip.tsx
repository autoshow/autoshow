import clsx from "clsx"
import type { SourceRoutesCreateStepsComponentsSharedChoiceChipProps as Props } from '~/types'
import s from "./ChoiceChip.module.css"
import shared from "./shared.module.css"

export default function ChoiceChip(props: Props) {
  return (
    <label class={clsx(shared.selectableLabel, s.choiceLabel, props.disabled && shared.selectableLabelDisabled)}>
      <input
        type="radio"
        name={props.name}
        value={props.value}
        checked={props.checked}
        onChange={() => props.onChange()}
        disabled={props.disabled}
        class={shared.hiddenControl}
      />
      <span class={clsx(shared.selectableSurface, s.choiceSurface, props.checked && shared.selectableSurfaceSelected)}>
        {props.children}
      </span>
    </label>
  )
}

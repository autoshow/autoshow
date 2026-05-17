import clsx from "clsx"
import { Show } from "solid-js"
import type { SourceRoutesCreateStepsComponentsSharedOptionButtonProps as Props,SourceRoutesCreateStepsComponentsSharedOptionButtonTogglePromptOptions as TogglePromptOptions } from '~/types'
import shared from "./shared.module.css"

export function togglePrompt(prompt: string, options: TogglePromptOptions): void {
  const { current, setter, maxItems } = options
  const currentArray = [...current()]
  if (currentArray.includes(prompt)) {
    setter(currentArray.filter(p => p !== prompt))
  } else if (maxItems === undefined || currentArray.length < maxItems) {
    setter([...currentArray, prompt])
  } else if (maxItems === 1) {
    setter([prompt])
  }
}

export default function OptionButton(props: Props) {
  const isFancy = () => props.variant !== "simple"
  const inputType = () => props.inputType ?? "radio"

  return (
    <label class={clsx(shared.selectableLabel, props.disabled && shared.selectableLabelDisabled)}>
      <input
        type={inputType()}
        name={props.name}
        value={props.value}
        checked={props.selected}
        onChange={() => props.onClick()}
        disabled={props.disabled}
        class={shared.hiddenControl}
      />
      <span
        class={clsx(
          shared.selectableSurface,
          shared.selectableContent,
          isFancy() ? shared.selectableContentFancy : shared.selectableContentSimple,
          props.selected && shared.selectableSurfaceSelected,
        )}
      >
        <Show when={props.service}>
          <span class={shared.selectableKickerRow}>
            <span class={shared.selectableKicker}>{props.service}</span>
            <Show when={props.costLabel}>
              <span class={shared.selectableCostLabel}>{props.costLabel}</span>
            </Show>
          </span>
        </Show>
        <span class={isFancy() ? shared.selectableTitle : shared.selectableTitleCompact}>
          {props.title}
        </span>
        <Show when={props.description}>
          <span class={shared.selectableDescription}>{props.description}</span>
        </Show>
        {props.children}
      </span>
    </label>
  )
}

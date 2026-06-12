import clsx from "clsx"
import { Show } from "solid-js"
import type { SourceRoutesCreateStepsComponentsSharedModelButtonProps as Props } from '~/types'
import shared from "./shared.module.css"

export default function ModelButton(props: Props) {
  return (
    <label class={clsx(shared.selectableLabel, props.disabled && shared.selectableLabelDisabled)}>
      <input
        type="radio"
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
          shared.selectableContentModel,
          props.selected && shared.selectableSurfaceSelected,
        )}
      >
        <span class={shared.selectableKickerRow}>
          <span class={shared.selectableKicker}>{props.service}</span>
          <Show when={props.costLabel}>
            <span class={shared.selectableCostLabel}>{props.costLabel}</span>
          </Show>
        </span>
        <span class={shared.selectableTitle}>{props.title}</span>
        <Show when={props.description}>
          <span class={shared.selectableDescription}>{props.description}</span>
        </Show>
        <Show when={props.speedLabel || props.quality}>
          <span class={shared.metaRow}>
            <Show when={props.speedLabel}>
              <span class={shared.metaChip}>Speed: {props.speedLabel}</span>
            </Show>
            <Show when={props.quality}>
              <span class={shared.metaChip}>Quality: {props.quality}</span>
            </Show>
          </span>
        </Show>
        {props.children}
      </span>
    </label>
  )
}

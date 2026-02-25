import type { JSXElement } from "solid-js"
import { Show } from "solid-js"
import s from "./ModelButton.module.css"

type Props = {
  service: string
  name: string
  description?: string | undefined
  speed?: string | undefined
  quality?: string | undefined
  selected: boolean
  disabled?: boolean | undefined
  onClick: () => void
  children?: JSXElement | undefined
}

export default function ModelButton(props: Props): JSXElement {
  return (
    <button
      type="button"
      class={props.selected ? s.modelButtonSelected : s.modelButton}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      <div class={s.modelService}>{props.service}</div>
      <div class={s.modelTitle}>{props.name}</div>
      <Show when={props.description}>
        <div class={s.modelDescription}>{props.description}</div>
      </Show>
      <Show when={props.speed && props.quality}>
        <div class={s.modelMeta}>
          <span class={s.modelSpeed}>Speed: {props.speed}</span>
          <span class={s.modelQuality}>Quality: {props.quality}</span>
        </div>
      </Show>
      {props.children}
    </button>
  )
}

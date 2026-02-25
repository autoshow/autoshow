import type { JSXElement } from "solid-js"
import { Show } from "solid-js"
import s from "./OptionButton.module.css"

type TogglePromptOptions = {
  current: () => string[]
  setter: (prompts: string[]) => void
  maxItems?: number | undefined
}

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

type Props = {
  title: string
  description?: string | undefined
  selected: boolean
  disabled?: boolean | undefined
  onClick: () => void
  variant?: 'fancy' | 'simple' | undefined
  service?: string | undefined
  speed?: string | undefined
  quality?: string | undefined
  children?: JSXElement | undefined
}

export default function OptionButton(props: Props): JSXElement {
  const isFancy = () => props.variant !== 'simple'

  const buttonClass = () => {
    if (isFancy()) {
      return props.selected ? s.optionButtonSelected : s.optionButton
    }
    return props.selected ? s.optionButtonSimpleSelected : s.optionButtonSimple
  }

  const titleClass = () => isFancy() ? s.optionTitle : s.optionTitleSimple

  return (
    <button
      type="button"
      class={buttonClass()}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      <Show when={props.service}>
        <div class={s.optionService}>{props.service}</div>
      </Show>
      <div class={titleClass()}>{props.title}</div>
      <Show when={props.description}>
        <div class={s.optionDescription}>{props.description}</div>
      </Show>
      <Show when={props.speed && props.quality}>
        <div class={s.optionMeta}>
          <span class={s.optionSpeed}>Speed: {props.speed}</span>
          <span class={s.optionQuality}>Quality: {props.quality}</span>
        </div>
      </Show>
      {props.children}
    </button>
  )
}

import type { JSXElement } from "solid-js"
import shared from "./shared.module.css"
import s from "./SkipCheckbox.module.css"

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean | undefined
  label: string
  helpText: string
}

export default function SkipCheckbox(props: Props): JSXElement {
  return (
    <div class={shared.formGroup}>
      <label class={s.checkboxLabel}>
        <input
          type="checkbox"
          checked={props.checked}
          onChange={(e) => props.onChange(e.currentTarget.checked)}
          disabled={props.disabled}
          class={s.checkbox}
        />
        <span class={s.checkboxText}>{props.label}</span>
      </label>
      <p class={shared.helpText}>{props.helpText}</p>
    </div>
  )
}

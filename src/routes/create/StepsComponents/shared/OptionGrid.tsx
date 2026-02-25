import type { JSXElement } from "solid-js"
import s from "./OptionGrid.module.css"

type Props = {
  children: JSXElement
}

export default function OptionGrid(props: Props): JSXElement {
  return (
    <div class={s.optionGrid}>
      {props.children}
    </div>
  )
}

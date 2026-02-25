import type { JSXElement } from "solid-js"
import s from "./ModelGrid.module.css"

type Props = {
  children: JSXElement
}

export default function ModelGrid(props: Props): JSXElement {
  return (
    <div class={s.modelGrid}>
      {props.children}
    </div>
  )
}

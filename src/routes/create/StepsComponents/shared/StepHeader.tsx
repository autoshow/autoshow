import type { JSXElement } from "solid-js"
import s from "./StepHeader.module.css"

type Props = {
  stepNumber: number
  title: string
  description: string
}

export default function StepHeader(props: Props): JSXElement {
  return (
    <>
      <h2 class={s.stepHeading}>Step {props.stepNumber}: {props.title}</h2>
      <div class={s.instructionBanner}>{props.description}</div>
    </>
  )
}

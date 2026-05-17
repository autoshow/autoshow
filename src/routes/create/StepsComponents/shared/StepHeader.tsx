import type { SourceRoutesCreateStepsComponentsSharedStepHeaderProps as Props } from '~/types'
import s from "./StepHeader.module.css"

export default function StepHeader(props: Props) {
  return (
    <div class={s.stepHeader}>
      <h2 class={s.stepHeading} data-step-heading tabindex={-1}>
        {props.stepNumber != null ? (
          <span class={s.stepBadge}>Step {props.stepNumber}: {props.title}</span>
        ) : (
          <span class={s.stepBadge}>{props.title}</span>
        )}
      </h2>
      <div class={s.instructionBanner}>{props.description}</div>
    </div>
  )
}

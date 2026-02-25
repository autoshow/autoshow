import type { JSXElement } from "solid-js"
import { For } from "solid-js"
import s from "./Pipeline.module.css"

type Step = {
  step: number
  title: string
  description: string
}

type Props = {
  steps: Step[]
  class?: string | undefined
}

export default function Pipeline(props: Props): JSXElement {
  return (
    <section class={`${s.section} ${props.class ?? ''}`}>
      <div class={s.inner}>
        <div class={s.header}>
          <h2 class={s.title}>
            8-Step Processing <span class={s.accent}>Pipeline</span>
          </h2>
          <p class={s.subtitle}>
            Content flows through a configurable pipeline. Each step can be customized with
            different providers and models. Optional steps are skipped if not enabled.
          </p>
        </div>

        <div class={s.grid}>
          <For each={props.steps}>
            {(step) => (
              <div class={s.step}>
                <div class={s.stepNumber}>{step.step}</div>
                <div class={s.stepContent}>
                  <h3 class={s.stepTitle}>{step.title}</h3>
                  <p class={s.stepDescription}>{step.description}</p>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </section>
  )
}

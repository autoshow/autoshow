import clsx from "clsx"
import { For } from "solid-js"
import m from "~/styles/marketing.module.css"
import ui from "~/styles/ui.module.css"
import type { SourceRoutesHomePipelineProps as Props } from '~/types'
import s from "./Pipeline.module.css"

export default function Pipeline(props: Props) {
  return (
    <section class={clsx(m.sectionAlt, props.class)}>
      <div class={m.inner}>
        <div class={m.sectionHeader}>
          <h2 class={m.sectionTitle}>
            8-Step Processing <span class={m.accent}>Pipeline</span>
          </h2>
          <p class={m.sectionSubtitle}>
            Content flows through a configurable pipeline. Each step can be customized with
            different providers and models. Optional steps are skipped if not enabled.
          </p>
        </div>

        <div class={s.grid}>
          <For each={props.steps}>
            {(step) => (
              <div class={clsx(ui.surface, ui.surfacePadded, s.step)}>
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

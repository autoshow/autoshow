import clsx from "clsx"
import { For,Show } from "solid-js"
import m from "~/styles/marketing.module.css"
import ui from "~/styles/ui.module.css"
import type { SourceRoutesHomeFeatureSectionProps as Props } from '~/types'
import s from "./FeatureSection.module.css"

export default function FeatureSection(props: Props) {
  const colClass = () => {
    const cols = props.columns ?? 3
    if (cols === 2) return s.cols2
    if (cols === 4) return s.cols4
    return s.cols3
  }

  return (
    <section class={clsx(props.altBg ? m.sectionAlt : m.section, props.class)}>
      <div class={m.inner}>
        <div class={m.sectionHeader}>
          <h2 class={m.sectionTitle}>
            {props.title} <span class={m.accent}>{props.accent}</span>
          </h2>
          <Show when={props.subtitle}>
            <p class={m.sectionSubtitle}>{props.subtitle}</p>
          </Show>
        </div>

        <div class={clsx(s.cardGrid, colClass())}>
          <For each={props.cards}>
            {(card) => (
              <div class={clsx(ui.surface, ui.surfacePadded, s.card)}>
                <h3 class={s.cardTitle}>{card.title}</h3>
                <p class={s.cardDescription}>{card.description}</p>
              </div>
            )}
          </For>
        </div>
      </div>
    </section>
  )
}

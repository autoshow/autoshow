import type { JSXElement } from "solid-js"
import { For, Show } from "solid-js"
import s from "./FeatureSection.module.css"

type Card = {
  title: string
  description: string
}

type Props = {
  title: string
  accent: string
  subtitle?: string | undefined
  cards: Card[]
  altBg?: boolean | undefined
  columns?: 2 | 3 | 4 | undefined
  class?: string | undefined
}

export default function FeatureSection(props: Props): JSXElement {
  const colClass = () => {
    const cols = props.columns ?? 3
    if (cols === 2) return s.cols2
    if (cols === 4) return s.cols4
    return s.cols3
  }

  return (
    <section class={`${props.altBg ? s.sectionAlt : s.section} ${props.class ?? ''}`}>
      <div class={s.inner}>
        <div class={s.header}>
          <h2 class={s.title}>
            {props.title} <span class={s.accent}>{props.accent}</span>
          </h2>
          <Show when={props.subtitle}>
            <p class={s.subtitle}>{props.subtitle}</p>
          </Show>
        </div>

        <div class={`${s.cardGrid} ${colClass()}`}>
          <For each={props.cards}>
            {(card) => (
              <div class={s.card}>
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

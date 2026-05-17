import clsx from "clsx"
import { For } from "solid-js"
import m from "~/styles/marketing.module.css"
import type { SourceRoutesHomeFAQProps as Props } from '~/types'
import s from "./FAQ.module.css"

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function FAQ(props: Props) {
  return (
    <section class={clsx(m.section, props.class)}>
      <div class={m.innerNarrow}>
        <div class={clsx(m.sectionHeader, m.sectionHeaderCompact)}>
          <h2 class={m.sectionTitle}>
            Frequently Asked <span class={m.accent}>Questions</span>
          </h2>
        </div>

        <div class={s.list}>
          <For each={props.items}>
            {(item) => (
              <details class={s.item}>
                <summary class={s.question}>
                  <span class={s.questionText}>{item.question}</span>
                  <span class={s.chevron}>
                    <ChevronIcon />
                  </span>
                </summary>
                <div class={s.answerWrapper}>
                  <p class={s.answer}>{item.answer}</p>
                </div>
              </details>
            )}
          </For>
        </div>
      </div>
    </section>
  )
}

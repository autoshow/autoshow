import type { JSXElement } from "solid-js"
import { For, createSignal } from "solid-js"
import s from "./FAQ.module.css"

type FAQItem = {
  question: string
  answer: string
}

type Props = {
  items: FAQItem[]
  class?: string | undefined
}

function ChevronIcon(): JSXElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function FAQ(props: Props): JSXElement {
  const [openIndex, setOpenIndex] = createSignal<number | null>(null)

  const toggle = (index: number) => {
    setOpenIndex(openIndex() === index ? null : index)
  }

  return (
    <section class={`${s.section} ${props.class ?? ''}`}>
      <div class={s.inner}>
        <div class={s.header}>
          <h2 class={s.title}>
            Frequently Asked <span class={s.accent}>Questions</span>
          </h2>
        </div>

        <div class={s.list}>
          <For each={props.items}>
            {(item, index) => {
              const isOpen = () => openIndex() === index()

              return (
                <div class={`${s.item} ${isOpen() ? s.itemOpen : ''}`}>
                  <button
                    type="button"
                    class={s.question}
                    onClick={() => toggle(index())}
                    aria-expanded={isOpen()}
                  >
                    <span class={s.questionText}>{item.question}</span>
                    <span class={`${s.chevron} ${isOpen() ? s.chevronOpen : ''}`}>
                      <ChevronIcon />
                    </span>
                  </button>
                  <div class={`${s.answerWrapper} ${isOpen() ? s.answerWrapperOpen : ''}`}>
                    <div class={s.answerInner}>
                      <p class={s.answer}>{item.answer}</p>
                    </div>
                  </div>
                </div>
              )
            }}
          </For>
        </div>
      </div>
    </section>
  )
}

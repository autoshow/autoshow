import clsx from "clsx"
import { For,Match,Show,Switch } from "solid-js"
import type { FAQItem,SourceRoutesShowNotesTextOutputPromptOutputBlockProps as Props,StructuredChapter } from '~/types'
import MarkdownText from "./MarkdownText"
import shared from "../shared.module.css"
import s from "./PromptOutputBlock.module.css"

export default function PromptOutputBlock(props: Props) {
  const value = () => props.textOutput[props.promptKey]
  const hasValue = () => {
    const v = value()
    if (v === undefined || v === null) return false
    if (Array.isArray(v)) return v.length > 0
    return true
  }

  const textValue = () => {
    const v = value()
    return typeof v === 'string' ? v : ''
  }

  const stringListValue = () => {
    const v = value()
    return Array.isArray(v) && v.every(item => typeof item === 'string') ? v : []
  }

  const faqValue = () => {
    const v = value()
    if (!Array.isArray(v)) return []
    return v.filter(item =>
      typeof item === 'object' && item !== null && 'question' in item && 'answer' in item
    ) as FAQItem[]
  }

  const chaptersValue = () => {
    const v = value()
    if (!Array.isArray(v)) return []
    return v.filter(item =>
      typeof item === 'object' && item !== null && 'timestamp' in item && 'title' in item
    ) as StructuredChapter[]
  }

  return (
    <Show when={hasValue()}>
      <div class={clsx(shared.contentCard, shared.contentCardPadded)}>
        <h3 class={s.subsectionTitle}>{props.displayTitle}</h3>
        <Switch>
          <Match when={props.renderType === 'text'}>
            <MarkdownText source={textValue()} html={props.markdownHtml ?? null} />
          </Match>
          <Match when={props.renderType === 'stringList'}>
            <ul class={s.bulletList}>
              <For each={stringListValue()}>
                {(item) => <li class={s.bulletItem}>{item}</li>}
              </For>
            </ul>
          </Match>
          <Match when={props.renderType === 'numberedList'}>
            <ol class={s.takeawayList}>
              <For each={stringListValue()}>
                {(item) => <li class={s.takeawayItem}>{item}</li>}
              </For>
            </ol>
          </Match>
          <Match when={props.renderType === 'faq'}>
            <div class={s.faqList}>
              <For each={faqValue()}>
                {(item) => (
                  <div class={shared.nestedCard}>
                    <p class={s.faqQuestion}>Q: {item.question}</p>
                    <p class={s.faqAnswer}>A: {item.answer}</p>
                  </div>
                )}
              </For>
            </div>
          </Match>
          <Match when={props.renderType === 'chapters'}>
            <div class={s.chapterList}>
              <For each={chaptersValue()}>
                {(chapter) => (
                  <div class={shared.nestedCard}>
                    <div class={s.chapterHeader}>
                      <span class={s.timestamp}>{chapter.timestamp}</span>
                      <span class={s.chapterTitle}>{chapter.title}</span>
                    </div>
                    <p class={s.chapterDescription}>{chapter.description}</p>
                  </div>
                )}
              </For>
            </div>
          </Match>
        </Switch>
      </div>
    </Show>
  )
}

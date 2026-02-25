import { Show, For, Switch, Match } from "solid-js"
import s from "./PromptOutputBlock.module.css"
import type { PromptRenderType } from "~/types"
import type { StructuredLLMResponse, StructuredChapter, FAQItem, PromptType } from "~/types"

type Props = {
  textOutput: StructuredLLMResponse
  promptKey: PromptType
  displayTitle: string
  renderType: PromptRenderType
}

export default function PromptOutputBlock(props: Props) {
  const value = () => props.textOutput[props.promptKey]
  const hasValue = () => {
    const v = value()
    if (v === undefined || v === null) return false
    if (Array.isArray(v)) return v.length > 0
    return true
  }

  const textValue = (): string => {
    const v = value()
    return typeof v === 'string' ? v : ''
  }

  const stringListValue = (): string[] => {
    const v = value()
    return Array.isArray(v) && v.every(item => typeof item === 'string') ? v : []
  }

  const faqValue = (): FAQItem[] => {
    const v = value()
    if (!Array.isArray(v)) return []
    return v.filter((item): item is FAQItem => 
      typeof item === 'object' && item !== null && 'question' in item && 'answer' in item
    )
  }

  const chaptersValue = (): StructuredChapter[] => {
    const v = value()
    if (!Array.isArray(v)) return []
    return v.filter((item): item is StructuredChapter => 
      typeof item === 'object' && item !== null && 'timestamp' in item && 'title' in item
    )
  }

  return (
    <Show when={hasValue()}>
      <div class={s.summaryBlock}>
        <h3 class={s.subsectionTitle}>{props.displayTitle}</h3>
        <Switch>
          <Match when={props.renderType === 'text'}>
            <p class={s.summaryText}>{textValue()}</p>
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
                  <div class={s.faqItem}>
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
                  <div class={s.chapter}>
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

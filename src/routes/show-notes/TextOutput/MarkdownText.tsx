import { Show } from "solid-js"
import s from "./PromptOutputBlock.module.css"

type MarkdownTextProps = {
  source: string
  html?: string | null
}

export default function MarkdownText(props: MarkdownTextProps) {
  return (
    <Show
      when={props.html && props.html.length > 0 ? props.html : null}
      fallback={<div class={s.markdownText}>{props.source}</div>}
    >
      {(html) => <div class={s.markdownText} innerHTML={html()} />}
    </Show>
  )
}

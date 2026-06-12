import clsx from "clsx"
import { For,Show } from "solid-js"
import type { MetadataItemConfig } from "~/types"
import shared from "../shared.module.css"
import s from "./MetadataCard.module.css"

function MetadataItem(props: { label: string; value: string | import("solid-js").JSX.Element }) {
  return (
    <div class={s.metadataItem}>
      <span class={s.metadataLabel}>{props.label}</span>
      <div class={s.metadataValue}>{props.value}</div>
    </div>
  )
}

export function MetadataCard(props: { title: string; enabled?: boolean | number | null | undefined; items: MetadataItemConfig[]; when?: boolean | undefined }) {
  const showSkipped = () => props.enabled === false || props.enabled === 0
  const showStep = () => props.when !== false

  return (
    <Show when={showStep()}>
      <div class={clsx(shared.contentCard, shared.contentCardPadded)}>
        <h3 class={s.metadataCardTitle}>{props.title}</h3>
        <Show when={!showSkipped()} fallback={<MetadataItem label="Status" value="Skipped" />}>
          <For each={props.items}>
            {(item) => (
              <Show when={item.when !== false}>
                <MetadataItem label={item.label} value={item.value} />
              </Show>
            )}
          </For>
        </Show>
      </div>
    </Show>
  )
}

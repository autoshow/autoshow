import { For, Show } from "solid-js"
import type { MetadataItemConfig } from "~/types"
import s from "./MetadataCard.module.css"

export function MetadataItem(props: { label: string; value: string | import("solid-js").JSX.Element }) {
  return (
    <div class={s.metadataItem}>
      <span class={s.metadataLabel}>{props.label}</span>
      <span class={s.metadataValue}>{props.value}</span>
    </div>
  )
}

export function MetadataCard(props: { title: string; enabled?: boolean | number | null | undefined; items: MetadataItemConfig[]; when?: boolean }) {
  const showSkipped = () => props.enabled === false || props.enabled === 0
  const showStep = () => props.when !== false

  return (
    <div class={s.metadataCard}>
      <h3 class={s.metadataCardTitle}>{props.title}</h3>
      <Show when={showStep()}>
        <Show when={!showSkipped()} fallback={<MetadataItem label="Status" value="Skipped" />}>
          <For each={props.items}>
            {(item) => (
              <Show when={item.when !== false}>
                <MetadataItem label={item.label} value={item.value} />
              </Show>
            )}
          </For>
        </Show>
      </Show>
    </div>
  )
}

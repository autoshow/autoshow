import clsx from "clsx"
import { Title } from "@solidjs/meta"
import { A,createAsync,revalidate,type RouteDefinition } from "@solidjs/router"
import { For,Show,createMemo,createSignal } from "solid-js"
import shared from "~/routes/create/StepsComponents/shared/shared.module.css"
import { getPresetListData } from "~/routes/presets/preset-data"
import {
deletePresetApi,
describePresetOutputs,
describePresetSourceConfig,
formatCompatibilityKey,
updatePresetApi,
} from "~/routes/presets/preset-service"
import ui from "~/styles/ui.module.css"
import type { SourceRoutesPresetsIndexFilterKey as FilterKey,PresetRecord } from '~/types'
import s from "./presets.module.css"

export const route: RouteDefinition = {
  preload: () => getPresetListData()
}

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "document", label: "Document" },
  { key: "audio-file", label: "Audio file" },
  { key: "audio-streaming", label: "Audio streaming" },
]

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

export default function Presets() {
  const presetData = createAsync(() => getPresetListData())

  const [filter, setFilter] = createSignal<FilterKey>("all")
  const [error, setError] = createSignal<string | null>(null)
  const [notice, setNotice] = createSignal<string | null>(null)

  const presets = (): PresetRecord[] => presetData()?.presets ?? []
  const isLoading = () => !presetData()

  const filteredPresets = createMemo(() => {
    const selectedFilter = filter()
    return selectedFilter === "all"
      ? presets()
      : presets().filter((preset) => preset.compatibilityKey === selectedFilter)
  })

  const renamePreset = async (preset: PresetRecord): Promise<void> => {
    const nextName = window.prompt("Rename preset", preset.name)?.trim()
    if (!nextName || nextName === preset.name) return

    setError(null)
    setNotice(null)
    try {
      const updated = await updatePresetApi(preset.id, { name: nextName })
      await revalidate(getPresetListData.key)
      setNotice(`Renamed preset to "${updated.name}"`)
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Failed to rename preset")
    }
  }

  const deletePreset = async (preset: PresetRecord): Promise<void> => {
    if (!window.confirm(`Delete preset "${preset.name}"?`)) return

    setError(null)
    setNotice(null)
    try {
      await deletePresetApi(preset.id)
      await revalidate(getPresetListData.key)
      setNotice(`Deleted preset "${preset.name}"`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete preset")
    }
  }

  return (
    <div class={s.container}>
      <Title>Presets - AutoShow</Title>
      <div class={s.inner}>
        <div class={s.header}>
          <div>
            <h1 class={s.title}>Presets</h1>
            <p class={s.description}>Create and manage reusable model, prompt, and output settings.</p>
          </div>
          <A href="/presets/new" class={clsx(ui.action, ui.actionLift, s.primaryButton)}>
            Create New Preset
          </A>
        </div>

        <section class={clsx(shared.panelShell, s.panel)}>
          <div class={s.filterBar}>
            <For each={FILTERS}>
              {(item) => (
                <button
                  type="button"
                  class={clsx(
                    ui.action,
                    ui.actionCompact,
                    s.secondaryButton,
                    filter() === item.key && s.filterButtonActive,
                  )}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                </button>
              )}
            </For>
          </div>

          <Show when={notice()}>
            <div class={clsx(ui.status, ui.statusSuccess, s.noticeBox)}>{notice()}</div>
          </Show>

          <Show when={error()}>
            <div class={clsx(ui.status, ui.statusDanger, s.errorBox)}>{error()}</div>
          </Show>

          <Show when={isLoading()}>
            <div class={s.emptyState}>Loading presets...</div>
          </Show>

          <Show when={!isLoading() && presets().length === 0}>
            <div class={s.emptyState}>No presets yet. Create one to reuse settings from the create flow.</div>
          </Show>

          <Show when={!isLoading() && presets().length > 0 && filteredPresets().length === 0}>
            <div class={s.emptyState}>No presets match this filter.</div>
          </Show>

          <Show when={!isLoading() && filteredPresets().length > 0}>
            <div class={s.presetList}>
              <For each={filteredPresets()}>
                {(preset) => (
                  <article class={clsx(shared.panelShellSoft, s.presetCard)}>
                    <div class={s.presetCardHeader}>
                      <div>
                        <h2 class={s.presetName}>{preset.name}</h2>
                        <p class={s.presetMeta}>{describePresetOutputs(preset)}</p>
                        <p class={s.presetMeta}>
                          {formatCompatibilityKey(preset.compatibilityKey)} · {describePresetSourceConfig(preset)}
                        </p>
                      </div>
                      <p class={s.timestampList}>
                        Created {formatDate(preset.createdAt)}
                        <br />
                        Updated {formatDate(preset.updatedAt)}
                      </p>
                    </div>

                    <div class={clsx(ui.actionRow, s.cardActions)}>
                      <A href={`/presets/${preset.id}`} class={clsx(ui.action, ui.actionLift, s.secondaryButton)}>
                        Edit
                      </A>
                      <button
                        type="button"
                        class={clsx(ui.action, ui.actionLift, s.secondaryButton)}
                        onClick={() => void renamePreset(preset)}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        class={clsx(ui.action, ui.actionLift, s.dangerButton)}
                        onClick={() => void deletePreset(preset)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                )}
              </For>
            </div>
          </Show>
        </section>
      </div>
    </div>
  )
}

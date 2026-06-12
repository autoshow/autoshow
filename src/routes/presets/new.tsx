import clsx from "clsx"
import { Title } from "@solidjs/meta"
import { A,createAsync,useNavigate,type RouteDefinition } from "@solidjs/router"
import { For,Show,createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import Steps from "~/routes/create/StepsComponents/Steps"
import shared from "~/routes/create/StepsComponents/shared/shared.module.css"
import { createInitialStepsState } from "~/routes/create/create-state"
import { getNewPresetRouteData } from "~/routes/presets/preset-data"
import { createPresetApi,formatCompatibilityKey } from "~/routes/presets/preset-service"
import { buildPresetConfigFromState,getPresetConfigError } from "~/routes/presets/presets"
import ui from "~/styles/ui.module.css"
import type { PresetCompatibilityKey } from "~/types"
import s from "./presets.module.css"

export const route: RouteDefinition = {
  preload: () => getNewPresetRouteData()
}

const COMPATIBILITY_OPTIONS: Array<{
  key: PresetCompatibilityKey
  title: string
  description: string
}> = [
  {
    key: "document",
    title: "Document",
    description: "PDF, Office, image, text, and document extraction settings.",
  },
  {
    key: "audio-file",
    title: "Audio file",
    description: "Uploaded audio and direct-file URL transcription settings.",
  },
  {
    key: "audio-streaming",
    title: "Audio streaming",
    description: "YouTube and streaming URL transcription settings.",
  },
]

export default function NewPreset() {
  const routeData = createAsync(() => getNewPresetRouteData())
  const navigate = useNavigate()
  const [state, setState] = createStore(createInitialStepsState())
  const [compatibilityKey, setCompatibilityKey] = createSignal<PresetCompatibilityKey | null>(null)
  const [isSaving, setIsSaving] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [presetName, setPresetName] = createSignal("")

  const documentRuntimeCapabilities = () => routeData()?.documentRuntimeCapabilities ?? null
  const selectedCompatibilityKey = (): PresetCompatibilityKey => compatibilityKey() ?? "document"

  const savePreset = async (): Promise<void> => {
    const key = compatibilityKey()
    if (!key) return

    const config = buildPresetConfigFromState(state, key)
    const configError = getPresetConfigError(config)
    if (configError) {
      setError(configError)
      return
    }

    const name = presetName().trim()
    if (!name) {
      setError("Preset name is required")
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await createPresetApi(name, config, 1)
      navigate("/presets")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save preset")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div class={s.container}>
      <Title>New Preset - AutoShow</Title>
      <div class={s.inner}>
        <div class={s.header}>
          <div>
            <h1 class={s.title}>New Preset</h1>
            <p class={s.description}>Choose a source compatibility type, then save reusable settings.</p>
          </div>
          <A href="/presets" class={clsx(ui.action, ui.actionLift, s.secondaryButton)}>
            Back to presets
          </A>
        </div>

        <Show when={error()}>
          <div class={clsx(ui.status, ui.statusDanger, s.errorBox)}>{error()}</div>
        </Show>

        <Show
          when={!compatibilityKey()}
          fallback={
            <div class={s.wizardStack}>
              <div class={clsx(shared.panelShell, s.panel)}>
                <p class={s.presetMeta}>Compatibility: {formatCompatibilityKey(selectedCompatibilityKey())}</p>
              </div>
              <Steps
                mode="preset"
                state={state}
                setState={setState}
                isProcessing={isSaving}
                canSubmit={() => true}
                documentType={null}
                documentRuntimeCapabilities={documentRuntimeCapabilities()}
                presetCompatibilityKey={selectedCompatibilityKey()}
                presetSubmitLabel="Save Preset"
                onPresetSave={savePreset}
                reviewFooter={
                  <label class={s.presetNameLabel}>
                    <span class={s.presetNameLabelText}>Preset name</span>
                    <input
                      type="text"
                      class={s.presetNameInput}
                      value={presetName()}
                      onInput={(e) => setPresetName(e.currentTarget.value)}
                      placeholder="Enter preset name"
                    />
                  </label>
                }
              />
            </div>
          }
        >
          <section class={clsx(shared.panelShell, s.panel)}>
            <h2 class={s.presetName}>Compatibility</h2>
            <div class={s.compatibilityGrid}>
              <For each={COMPATIBILITY_OPTIONS}>
                {(option) => (
                  <button
                    type="button"
                    class={clsx(ui.action, ui.actionLift, s.secondaryButton, s.compatibilityButton)}
                    onClick={() => setCompatibilityKey(option.key)}
                  >
                    <span class={s.compatibilityTitle}>{option.title}</span>
                    <span class={s.compatibilityText}>{option.description}</span>
                  </button>
                )}
              </For>
            </div>
          </section>
        </Show>
      </div>
    </div>
  )
}

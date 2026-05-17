import clsx from "clsx"
import { Title } from "@solidjs/meta"
import { A,createAsync,useNavigate,useParams,type RouteDefinition } from "@solidjs/router"
import { Match,Show,Switch,createSignal,untrack } from "solid-js"
import { createStore } from "solid-js/store"
import Steps from "~/routes/create/StepsComponents/Steps"
import shared from "~/routes/create/StepsComponents/shared/shared.module.css"
import { createInitialStepsState } from "~/routes/create/create-state"
import { getPresetEditorRouteData,type PresetEditorRouteData } from "~/routes/presets/preset-data"
import { formatCompatibilityKey,updatePresetApi } from "~/routes/presets/preset-service"
import { applyPresetConfigToState,buildPresetConfigFromState,getPresetConfigError } from "~/routes/presets/presets"
import ui from "~/styles/ui.module.css"
import type { PresetRecord } from "~/types"
import s from "./presets.module.css"

export const route: RouteDefinition = {
  preload: ({ params }) => getPresetEditorRouteData(params.id ?? "")
}

type LoadedPresetEditorData = PresetEditorRouteData & {
  preset: PresetRecord
}

function EditPresetWizard(props: { data: LoadedPresetEditorData }) {
  const navigate = useNavigate()
  const initialState = untrack(() => {
    return applyPresetConfigToState(createInitialStepsState(), props.data.preset.config)
  })
  const [state, setState] = createStore(initialState)
  const [isSaving, setIsSaving] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const savePreset = async (): Promise<void> => {
    const config = buildPresetConfigFromState(state, props.data.preset.compatibilityKey)
    const configError = getPresetConfigError(config)
    if (configError) {
      setError(configError)
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await updatePresetApi(props.data.preset.id, { config })
      navigate("/presets")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update preset")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Show when={error()}>
        <div class={clsx(ui.status, ui.statusDanger, s.errorBox)}>{error()}</div>
      </Show>
      <Steps
        mode="preset"
        state={state}
        setState={setState}
        isProcessing={isSaving}
        canSubmit={() => true}
        documentType={null}
        documentRuntimeCapabilities={props.data.documentRuntimeCapabilities}
        presetCompatibilityKey={props.data.preset.compatibilityKey}
        presetSubmitLabel="Update Preset"
        onPresetSave={savePreset}
      />
    </>
  )
}

export default function EditPreset() {
  const params = useParams()
  const editorData = createAsync(() => getPresetEditorRouteData(params.id ?? ""))
  const preset = (): PresetRecord | null => editorData()?.preset ?? null
  const loadedEditorData = (): LoadedPresetEditorData | null => {
    const data = editorData()
    if (!data?.preset) return null
    return {
      documentRuntimeCapabilities: data.documentRuntimeCapabilities,
      preset: data.preset,
    }
  }

  return (
    <div class={s.container}>
      <Title>Edit Preset - AutoShow</Title>
      <div class={s.inner}>
        <div class={s.header}>
          <div>
            <h1 class={s.title}>{preset()?.name ?? "Edit Preset"}</h1>
            <p class={s.description}>
              {preset() ? <>Compatibility: {formatCompatibilityKey(preset()!.compatibilityKey)}</> : ""}
            </p>
          </div>
          <A href="/presets" class={clsx(ui.action, ui.actionLift, s.secondaryButton)}>
            Back to presets
          </A>
        </div>

        <Switch>
          <Match when={!editorData()}>
            <section class={clsx(shared.panelShell, s.panel)}>
              <div class={s.emptyState}>Loading preset...</div>
            </section>
          </Match>
          <Match when={editorData() && !preset()}>
            <section class={clsx(shared.panelShell, s.panel)}>
              <div class={s.emptyState}>Preset not found</div>
            </section>
          </Match>
          <Match when={!!loadedEditorData()}>
            <EditPresetWizard data={loadedEditorData()!} />
          </Match>
        </Switch>
      </div>
    </div>
  )
}

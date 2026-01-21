import { Show, For } from "solid-js"
import s from "./Step2.module.css"
import { SERVICES_CONFIG } from "~/utils/services"

type Props = {
  transcriptionOption: string
  setTranscriptionOption: (value: string) => void
  disabled: boolean | undefined
  urlType?: string
  hasFile: boolean
  transcriptionModel: string
  setTranscriptionModel: (value: string) => void
}

export default function Step2(props: Props) {
  const handleModelClick = (service: string, modelId: string): void => {
    props.setTranscriptionOption(service)
    props.setTranscriptionModel(modelId)
  }

  const isModelSelected = (service: string, modelId: string): boolean => {
    return props.transcriptionOption === service && props.transcriptionModel === modelId
  }

  const shouldShowWhisperOptions = (): boolean => {
    if (!props.hasFile && !props.urlType) return true
    return props.hasFile || props.urlType === "direct-file"
  }

  const shouldShowStreamingOptions = (): boolean => {
    if (!props.hasFile && !props.urlType) return true
    return props.urlType === "youtube" || props.urlType === "streaming"
  }

  return (
    <>
      <h2 class={s.stepHeading}>Step 2: Run Transcription</h2>

      <div class={s.instructionBanner}>
        Select a transcription service and model. Options will update based on your source selection.
      </div>

      <input 
        type="hidden" 
        name="transcriptionOption" 
        value={props.transcriptionOption} 
      />

      <Show when={shouldShowWhisperOptions()}>
        <h3 class={s.serviceHeading}>Without Speaker Labels</h3>

        <h4 class={s.providerHeading}>{SERVICES_CONFIG.transcription.whisper.groq.name}</h4>
        <div class={s.optionGrid}>
          <For each={SERVICES_CONFIG.transcription.whisper.groq.models}>
            {(model) => (
              <button
                type="button"
                class={isModelSelected('groq', model.id) ? s.optionButtonSelected : s.optionButton}
                onClick={() => handleModelClick('groq', model.id)}
                disabled={props.disabled}
              >
                <div class={s.optionTitle}>{model.name}</div>
                <div class={s.optionDescription}>{model.description}</div>
                <div class={s.optionMeta}>
                  <span class={s.optionSpeed}>Speed: {model.speed}</span>
                  <span class={s.optionQuality}>Quality: {model.quality}</span>
                </div>
              </button>
            )}
          </For>
        </div>

        <h4 class={s.providerHeading}>{SERVICES_CONFIG.transcription.whisper.deepinfra.name}</h4>
        <div class={s.optionGrid}>
          <For each={SERVICES_CONFIG.transcription.whisper.deepinfra.models}>
            {(model) => (
              <button
                type="button"
                class={isModelSelected('deepinfra', model.id) ? s.optionButtonSelected : s.optionButton}
                onClick={() => handleModelClick('deepinfra', model.id)}
                disabled={props.disabled}
              >
                <div class={s.optionTitle}>{model.name}</div>
                <div class={s.optionDescription}>{model.description}</div>
                <div class={s.optionMeta}>
                  <span class={s.optionSpeed}>Speed: {model.speed}</span>
                  <span class={s.optionQuality}>Quality: {model.quality}</span>
                </div>
              </button>
            )}
          </For>
        </div>

        <h3 class={s.serviceHeading}>With Speaker Labels</h3>

        <h4 class={s.providerHeading}>{SERVICES_CONFIG.transcription.diarization.lemonfox.name}</h4>
        <div class={s.optionGrid}>
          <For each={SERVICES_CONFIG.transcription.diarization.lemonfox.models}>
            {(model) => (
              <button
                type="button"
                class={isModelSelected('lemonfox', model.id) ? s.optionButtonSelected : s.optionButton}
                onClick={() => handleModelClick('lemonfox', model.id)}
                disabled={props.disabled}
              >
                <div class={s.optionTitle}>{model.name}</div>
                <div class={s.optionDescription}>{model.description}</div>
                <div class={s.optionMeta}>
                  <span class={s.optionSpeed}>Speed: {model.speed}</span>
                  <span class={s.optionQuality}>Quality: {model.quality}</span>
                </div>
              </button>
            )}
          </For>
        </div>

        </Show>

      <Show when={shouldShowStreamingOptions()}>
        <h3 class={s.serviceHeading}>Paid Services</h3>
        <div class={s.optionGrid}>
          <For each={SERVICES_CONFIG.transcription.streaming.happyscribe.models}>
            {(model) => (
              <button
                type="button"
                class={isModelSelected('happyscribe', model.id) ? s.optionButtonSelected : s.optionButton}
                onClick={() => handleModelClick('happyscribe', model.id)}
                disabled={props.disabled}
              >
                <div class={s.optionTitle}>{SERVICES_CONFIG.transcription.streaming.happyscribe.name}</div>
                <div class={s.optionDescription}>{model.description}</div>
                <div class={s.optionMeta}>
                  <span class={s.optionSpeed}>Speed: {model.speed}</span>
                  <span class={s.optionQuality}>Quality: {model.quality}</span>
                </div>
              </button>
            )}
          </For>
        </div>
      </Show>
    </>
  )
}

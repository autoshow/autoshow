import { Show, For } from "solid-js"
import s from "./Step5.module.css"
import { SERVICES_CONFIG } from "~/utils/services"

type Props = {
  ttsSkipped: boolean
  setTtsSkipped: (value: boolean) => void
  ttsService: string
  setTtsService: (value: string) => void
  ttsVoice: string
  setTtsVoice: (value: string) => void
  disabled: boolean | undefined
}

export default function Step5(props: Props) {
  const handleVoiceSelect = (service: string, voiceId: string) => {
    props.setTtsService(service)
    props.setTtsVoice(voiceId)
  }

  return (
    <>
      <h2 class={s.stepHeading}>Step 5: Text-to-Speech (Optional)</h2>

      <div class={s.instructionBanner}>
        Optionally generate an audio version of your content with natural-sounding AI voices.
      </div>

      <input 
        type="hidden" 
        name="ttsSkipped" 
        value={props.ttsSkipped ? "true" : "false"} 
      />

      <input 
        type="hidden" 
        name="ttsService" 
        value={props.ttsService} 
      />

      <input 
        type="hidden" 
        name="ttsVoice" 
        value={props.ttsVoice} 
      />

      <div class={s.formGroup}>
        <label class={s.checkboxLabel}>
          <input
            type="checkbox"
            checked={props.ttsSkipped}
            onChange={(e) => props.setTtsSkipped(e.currentTarget.checked)}
            disabled={props.disabled}
            class={s.checkbox}
          />
          <span class={s.checkboxText}>Skip text-to-speech generation</span>
        </label>
        <p class={s.helpText}>
          Check this box to skip generating a spoken audio version of your content.
        </p>
      </div>

      <Show when={!props.ttsSkipped}>
        <h3 class={s.serviceHeading}>{SERVICES_CONFIG.tts.openai.name}</h3>
        <div class={s.optionGrid}>
          <For each={SERVICES_CONFIG.tts.openai.voices}>
            {(voice) => (
              <button
                type="button"
                class={props.ttsService === 'openai' && props.ttsVoice === voice.id ? s.optionButtonSelected : s.optionButton}
                onClick={() => handleVoiceSelect('openai', voice.id)}
                disabled={props.disabled}
              >
                <div class={s.optionTitle}>{voice.name}</div>
                <div class={s.optionDescription}>{voice.description}</div>
              </button>
            )}
          </For>
        </div>

        <h3 class={s.serviceHeading}>{SERVICES_CONFIG.tts.elevenlabs.name}</h3>
        <div class={s.optionGrid}>
          <For each={SERVICES_CONFIG.tts.elevenlabs.voices}>
            {(voice) => (
              <button
                type="button"
                class={props.ttsService === 'elevenlabs' && props.ttsVoice === voice.id ? s.optionButtonSelected : s.optionButton}
                onClick={() => handleVoiceSelect('elevenlabs', voice.id)}
                disabled={props.disabled}
              >
                <div class={s.optionTitle}>{voice.name}</div>
                <div class={s.optionDescription}>{voice.description}</div>
              </button>
            )}
          </For>
        </div>
      </Show>
    </>
  )
}
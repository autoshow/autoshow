import { Show, For } from "solid-js"
import shared from "../shared/shared.module.css"
import { StepHeader, SkipCheckbox, OptionButton, OptionGrid, ModelButton, ModelGrid } from "../shared"
import { TTS_CONFIG } from "~/models"
import type { TTSServiceType, TTSConfig } from "~/types"

type Props = {
  ttsSkipped: boolean
  setTtsSkipped: (value: boolean) => void
  ttsService: string
  setTtsService: (value: string) => void
  ttsVoice: string
  setTtsVoice: (value: string) => void
  ttsModel: string
  setTtsModel: (value: string) => void
  disabled: boolean | undefined
}

type TTSEntry = [TTSServiceType, TTSConfig[TTSServiceType]]

function getTTSEntries(config: TTSConfig): TTSEntry[] {
  return (Object.keys(config) as TTSServiceType[]).map(key => [key, config[key]])
}

function isTTSServiceType(value: string): value is TTSServiceType {
  return value in TTS_CONFIG
}

export default function Step5(props: Props) {
  const ttsServices = getTTSEntries(TTS_CONFIG)

  const handleModelClick = (serviceId: TTSServiceType, modelId: string) => {
    props.setTtsService(serviceId)
    props.setTtsModel(modelId)
    const config = TTS_CONFIG[serviceId]
    props.setTtsVoice(config.voices[0]?.id || '')
  }

  const isModelSelected = (serviceId: TTSServiceType, modelId: string): boolean => {
    return props.ttsService === serviceId && props.ttsModel === modelId
  }

  const currentVoices = () => {
    const service = props.ttsService
    if (!isTTSServiceType(service)) return []
    return TTS_CONFIG[service]?.voices || []
  }

  return (
    <>
      <StepHeader
        stepNumber={5}
        title="Text-to-Speech (Optional)"
        description="Optionally generate an audio version of your content with natural-sounding AI voices."
      />

      <input type="hidden" name="ttsSkipped" value={props.ttsSkipped ? "true" : "false"} />
      <input type="hidden" name="ttsService" value={props.ttsService} />
      <input type="hidden" name="ttsVoice" value={props.ttsVoice} />
      <input type="hidden" name="ttsModel" value={props.ttsModel} />

      <SkipCheckbox
        checked={props.ttsSkipped}
        onChange={props.setTtsSkipped}
        disabled={props.disabled}
        label="Skip text-to-speech generation"
        helpText="Check this box to skip generating a spoken audio version of your content."
      />

      <Show when={!props.ttsSkipped}>
        <div class={shared.formGroup}>
          <label class={shared.label}>Select TTS Model</label>
          <ModelGrid>
            <For each={ttsServices}>
              {([serviceId, serviceConfig]) => (
                <For each={serviceConfig.models}>
                  {(model) => (
                    <ModelButton
                      service={serviceConfig.name}
                      name={model.name}
                      description={model.description}
                      speed={model.speed}
                      quality={model.quality}
                      selected={isModelSelected(serviceId, model.id)}
                      disabled={props.disabled}
                      onClick={() => handleModelClick(serviceId, model.id)}
                    />
                  )}
                </For>
              )}
            </For>
          </ModelGrid>
        </div>

        <div class={shared.formGroup}>
          <label class={shared.label}>Select Voice</label>
          <OptionGrid>
            <For each={currentVoices()}>
              {(voice) => (
                <OptionButton
                  title={voice.name}
                  description={voice.description}
                  selected={props.ttsVoice === voice.id}
                  disabled={props.disabled}
                  onClick={() => props.setTtsVoice(voice.id)}
                  variant="simple"
                />
              )}
            </For>
          </OptionGrid>
        </div>
      </Show>
    </>
  )
}

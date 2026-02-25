import { Show, For, createMemo } from "solid-js"
import shared from "../shared/shared.module.css"
import s from "./Transcription.module.css"
import { ModelButton, ModelGrid } from "../shared"
import { TRANSCRIPTION_CONFIG } from "~/models"
import type { TranscriptionConfig } from "~/types"

type Props = {
  transcriptionOption: string
  setTranscriptionOption: (value: string) => void
  transcriptionModel: string
  setTranscriptionModel: (value: string) => void
  disabled: boolean | undefined
  durationSeconds?: number | undefined
  showWhisperOptions: boolean
  showStreamingOptions: boolean
}

type WhisperServiceKey = keyof TranscriptionConfig['whisper']
type DiarizationServiceKey = keyof TranscriptionConfig['diarization']
type StreamingServiceKey = keyof TranscriptionConfig['streaming']

function isWhisperServiceKey(key: string): key is WhisperServiceKey {
  return key in TRANSCRIPTION_CONFIG.whisper
}

function isDiarizationServiceKey(key: string): key is DiarizationServiceKey {
  return key in TRANSCRIPTION_CONFIG.diarization
}

function isStreamingServiceKey(key: string): key is StreamingServiceKey {
  return key in TRANSCRIPTION_CONFIG.streaming
}

export default function Transcription(props: Props) {
  const billedMinutes = createMemo(() => {
    if (!props.durationSeconds) return 0
    return Math.ceil(props.durationSeconds / 60)
  })

  const getModelCenticentsPerMin = (service: string, modelId: string): number | undefined => {
    let serviceConfig
    if (isWhisperServiceKey(service)) {
      serviceConfig = TRANSCRIPTION_CONFIG.whisper[service]
    } else if (isDiarizationServiceKey(service)) {
      serviceConfig = TRANSCRIPTION_CONFIG.diarization[service]
    } else if (isStreamingServiceKey(service)) {
      serviceConfig = TRANSCRIPTION_CONFIG.streaming[service]
    }

    if (!serviceConfig) return undefined

    const model = serviceConfig.models.find(m => m.id === modelId)
    return model?.centicentsPerMin
  }

  const calculateCost = (service: string, modelId: string): { cents: string } | null => {
    const minutes = billedMinutes()
    if (minutes === 0) return null

    const centicentsPerMin = getModelCenticentsPerMin(service, modelId)
    if (centicentsPerMin === undefined) return null

    const totalCenticents = centicentsPerMin * minutes
    const totalCents = totalCenticents / 100
    return {
      cents: totalCents < 0.01 ? '<0.01' : totalCents.toFixed(2)
    }
  }

  const handleModelClick = (service: string, modelId: string): void => {
    props.setTranscriptionOption(service)
    props.setTranscriptionModel(modelId)
  }

  const isModelSelected = (service: string, modelId: string): boolean => {
    return props.transcriptionOption === service && props.transcriptionModel === modelId
  }

  return (
    <>
      <Show when={props.showWhisperOptions}>
        <div class={shared.formGroup}>
          <label class={shared.label}>Without Speaker Labels</label>
          <ModelGrid>
            <For each={Object.entries(TRANSCRIPTION_CONFIG.whisper)}>
              {([serviceKey, serviceConfig]) => (
                <For each={serviceConfig.models}>
                  {(model) => {
                    const cost = () => calculateCost(serviceKey, model.id)
                    return (
                      <ModelButton
                        service={serviceConfig.name}
                        name={model.name}
                        speed={model.speed}
                        quality={model.quality}
                        selected={isModelSelected(serviceKey, model.id)}
                        disabled={props.disabled}
                        onClick={() => handleModelClick(serviceKey, model.id)}
                      >
                        <Show when={cost()}>
                          <div class={s.optionCost}>
                            <span class={s.costCents}>{cost()!.cents}¢</span>
                          </div>
                        </Show>
                      </ModelButton>
                    )
                  }}
                </For>
              )}
            </For>
          </ModelGrid>
        </div>

        <div class={shared.formGroup}>
          <label class={shared.label}>With Speaker Labels</label>
          <ModelGrid>
            <For each={Object.entries(TRANSCRIPTION_CONFIG.diarization)}>
              {([serviceKey, serviceConfig]) => (
                <For each={serviceConfig.models}>
                  {(model) => {
                    const cost = () => calculateCost(serviceKey, model.id)
                    return (
                      <ModelButton
                        service={serviceConfig.name}
                        name={model.name}
                        speed={model.speed}
                        quality={model.quality}
                        selected={isModelSelected(serviceKey, model.id)}
                        disabled={props.disabled}
                        onClick={() => handleModelClick(serviceKey, model.id)}
                      >
                        <Show when={cost()}>
                          <div class={s.optionCost}>
                            <span class={s.costCents}>{cost()!.cents}¢</span>
                          </div>
                        </Show>
                      </ModelButton>
                    )
                  }}
                </For>
              )}
            </For>
          </ModelGrid>
        </div>
      </Show>

      <Show when={props.showStreamingOptions}>
        <div class={shared.formGroup}>
          <label class={shared.label}>Streaming Services</label>
          <ModelGrid>
            <For each={Object.entries(TRANSCRIPTION_CONFIG.streaming)}>
              {([serviceKey, serviceConfig]) => (
                <For each={serviceConfig.models}>
                  {(model) => {
                    const cost = () => calculateCost(serviceKey, model.id)
                    return (
                      <ModelButton
                        service={serviceConfig.name}
                        name={model.name}
                        speed={model.speed}
                        quality={model.quality}
                        selected={isModelSelected(serviceKey, model.id)}
                        disabled={props.disabled}
                        onClick={() => handleModelClick(serviceKey, model.id)}
                      >
                        <Show when={cost()}>
                          <div class={s.optionCost}>
                            <span class={s.costCents}>{cost()!.cents}¢</span>
                          </div>
                        </Show>
                      </ModelButton>
                    )
                  }}
                </For>
              )}
            </For>
          </ModelGrid>
        </div>
      </Show>
    </>
  )
}

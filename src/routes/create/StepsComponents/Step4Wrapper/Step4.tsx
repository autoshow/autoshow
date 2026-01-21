import { For, createMemo } from "solid-js"
import s from "./Step4.module.css"
import { SERVICES_CONFIG, getLLMProviders, getLLMModelsForService } from "~/utils/services"

type Props = {
  llmService: string
  setLlmService: (value: string) => void
  llmModel: string
  setLlmModel: (value: string) => void
  disabled: boolean | undefined
}

export default function Step4(props: Props) {
  const providers = getLLMProviders()
  const currentModels = createMemo(() => getLLMModelsForService(props.llmService))
  const currentProviderName = createMemo(() => {
    const config = SERVICES_CONFIG.llm[props.llmService as keyof typeof SERVICES_CONFIG.llm]
    return config?.name ?? props.llmService
  })

  return (
    <>
      <h2 class={s.stepHeading}>Step 4: LLM Text Generation</h2>

      <div class={s.instructionBanner}>
        Select an AI provider and model to generate your content.
      </div>

      <input type="hidden" name="llmService" value={props.llmService} />
      <input type="hidden" name="llmModel" value={props.llmModel} />

      <h3 class={s.serviceHeading}>Select Provider</h3>
      <div class={s.providerGrid}>
        <For each={providers}>
          {(providerId) => {
            const config = SERVICES_CONFIG.llm[providerId as keyof typeof SERVICES_CONFIG.llm]
            return (
              <button
                type="button"
                class={props.llmService === providerId ? s.providerButtonSelected : s.providerButton}
                onClick={() => {
                  props.setLlmService(providerId)
                  const models = getLLMModelsForService(providerId)
                  if (models[0]) {
                    props.setLlmModel(models[0].id)
                  }
                }}
                disabled={props.disabled}
              >
                {config.name}
              </button>
            )
          }}
        </For>
      </div>

      <h3 class={s.serviceHeading}>{currentProviderName()} Models</h3>
      <div class={s.optionGrid}>
        <For each={currentModels()}>
          {(model) => (
            <button
              type="button"
              class={props.llmModel === model.id ? s.optionButtonSelected : s.optionButton}
              onClick={() => props.setLlmModel(model.id)}
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
    </>
  )
}

import { For } from "solid-js"
import shared from "../shared/shared.module.css"
import { StepHeader, ModelButton, ModelGrid } from "../shared"
import { LLM_CONFIG, getLLMProviders, getLLMModelsForService } from "~/models"
import type { LLMServiceType } from "~/types"

type Props = {
  llmService: LLMServiceType
  setLlmService: (value: LLMServiceType) => void
  llmModel: string
  setLlmModel: (value: string) => void
  disabled: boolean | undefined
}

function isLLMServiceType(value: string): value is LLMServiceType {
  return value in LLM_CONFIG
}

export default function Step4(props: Props) {
  const providers = getLLMProviders()

  const handleModelClick = (providerId: LLMServiceType, modelId: string) => {
    props.setLlmService(providerId)
    props.setLlmModel(modelId)
  }

  const isModelSelected = (providerId: string, modelId: string): boolean => {
    return props.llmService === providerId && props.llmModel === modelId
  }

  return (
    <>
      <StepHeader
        stepNumber={4}
        title="LLM Text Generation"
        description="Select an AI provider and model to generate your content."
      />

      <input type="hidden" name="llmService" value={props.llmService} />
      <input type="hidden" name="llmModel" value={props.llmModel} />

      <div class={shared.formGroup}>
        <label class={shared.label}>Select LLM Model</label>
        <ModelGrid>
          <For each={providers}>
            {(providerId) => {
              if (!isLLMServiceType(providerId)) return null
              const config = LLM_CONFIG[providerId]
              const models = getLLMModelsForService(providerId)
              return (
                <For each={models}>
                  {(model) => (
                    <ModelButton
                      service={config.name}
                      name={model.name}
                      description={model.description}
                      speed={model.speed}
                      quality={model.quality}
                      selected={isModelSelected(providerId, model.id)}
                      disabled={props.disabled}
                      onClick={() => handleModelClick(providerId, model.id)}
                    />
                  )}
                </For>
              )
            }}
          </For>
        </ModelGrid>
      </div>
    </>
  )
}

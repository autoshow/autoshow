import { Show, For, createMemo } from "solid-js"
import shared from "../shared/shared.module.css"
import { StepHeader, SkipCheckbox, OptionButton, OptionGrid, ModelButton, ModelGrid, togglePrompt } from "../shared"
import { IMAGE_CONFIG } from "~/models/image-config"
import { IMAGE_PROMPT_CONFIG, IMAGE_PROMPT_TYPES } from "~/prompts/image-prompts"
import type { ImageGenServiceType, ImageConfig } from "~/types"

type Props = {
  imageGenSkipped: boolean
  setImageGenSkipped: (value: boolean) => void
  selectedImagePrompts: string[]
  setSelectedImagePrompts: (prompts: string[]) => void
  imageService: ImageGenServiceType
  setImageService: (service: ImageGenServiceType) => void
  imageModel: string
  setImageModel: (model: string) => void
  imageDimensionOrRatio: string
  setImageDimensionOrRatio: (ratio: string) => void
  disabled: boolean | undefined
}

type ImageEntry = [ImageGenServiceType, ImageConfig[ImageGenServiceType]]

function getImageEntries(config: ImageConfig): ImageEntry[] {
  return (Object.keys(config) as ImageGenServiceType[]).map(key => [key, config[key]])
}

export default function Step6(props: Props) {
  const currentConfig = createMemo(() => IMAGE_CONFIG[props.imageService])

  const imageServices = getImageEntries(IMAGE_CONFIG)

  const handleModelClick = (serviceId: ImageGenServiceType, modelId: string) => {
    props.setImageService(serviceId)
    props.setImageModel(modelId)
    const config = IMAGE_CONFIG[serviceId]
    if (config.dimensions) {
      props.setImageDimensionOrRatio(config.dimensions[0]?.id || '1024x1024')
    } else if (config.aspectRatios) {
      props.setImageDimensionOrRatio(config.aspectRatios[0] || '1:1')
    }
  }

  const isModelSelected = (serviceId: ImageGenServiceType, modelId: string): boolean => {
    return props.imageService === serviceId && props.imageModel === modelId
  }

  return (
    <>
      <StepHeader
        stepNumber={6}
        title="AI Image Generation (Optional)"
        description="Optionally create AI-generated images based on your content."
      />

      <input 
        type="hidden" 
        name="imageGenSkipped" 
        value={props.imageGenSkipped ? "true" : "false"} 
      />

      <input 
        type="hidden" 
        name="selectedImagePrompts" 
        value={props.selectedImagePrompts.join(',')} 
      />

      <input type="hidden" name="imageService" value={props.imageService} />
      <input type="hidden" name="imageModel" value={props.imageModel} />
      <input type="hidden" name="imageDimensionOrRatio" value={props.imageDimensionOrRatio} />

      <SkipCheckbox
        checked={props.imageGenSkipped}
        onChange={props.setImageGenSkipped}
        disabled={props.disabled}
        label="Skip AI image generation"
        helpText="Check this box to skip generating AI images based on your content."
      />

      <Show when={!props.imageGenSkipped}>
        <div class={shared.formGroup}>
          <label class={shared.label}>Select Image Model</label>
          <ModelGrid>
            <For each={imageServices}>
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

        <Show when={currentConfig()?.aspectRatios}>
          <div class={shared.formGroup}>
            <label class={shared.label}>Select Aspect Ratio</label>
            <div class={shared.aspectRatioGrid}>
              <For each={currentConfig()?.aspectRatios || []}>
                {(ratio) => {
                  const isSelected = () => props.imageDimensionOrRatio === ratio
                  return (
                    <button
                      type="button"
                      class={isSelected() ? shared.aspectRatioButtonSelected : shared.aspectRatioButton}
                      onClick={() => props.setImageDimensionOrRatio(ratio)}
                      disabled={props.disabled}
                    >
                      {ratio}
                    </button>
                  )
                }}
              </For>
            </div>
          </div>
        </Show>

        <Show when={currentConfig()?.dimensions}>
          <div class={shared.formGroup}>
            <label class={shared.label}>Select Dimensions</label>
            <div class={shared.aspectRatioGrid}>
              <For each={currentConfig()?.dimensions || []}>
                {(dimension) => {
                  const isSelected = () => props.imageDimensionOrRatio === dimension.id
                  return (
                    <button
                      type="button"
                      class={isSelected() ? shared.aspectRatioButtonSelected : shared.aspectRatioButton}
                      onClick={() => props.setImageDimensionOrRatio(dimension.id)}
                      disabled={props.disabled}
                    >
                      {dimension.name}
                    </button>
                  )
                }}
              </For>
            </div>
          </div>
        </Show>

        <div class={shared.formGroup}>
          <label class={shared.label}>
            Select Image Prompt (1)
          </label>
          
          <OptionGrid>
            <For each={IMAGE_PROMPT_TYPES}>
              {(promptType) => {
                const config = IMAGE_PROMPT_CONFIG[promptType]
                const isSelected = () => props.selectedImagePrompts.includes(promptType)
                
                return (
                  <OptionButton
                    title={config.title}
                    description={config.description}
                    selected={isSelected()}
                    disabled={props.disabled}
                    onClick={() => togglePrompt(promptType, { current: () => props.selectedImagePrompts, setter: props.setSelectedImagePrompts, maxItems: 1 })}
                    variant="simple"
                  />
                )
              }}
            </For>
          </OptionGrid>

          <p class={shared.promptHelpText}>
            Select 1 type of image to generate. {props.selectedImagePrompts.length > 0 && `${props.selectedImagePrompts.length} of 1 selected.`}
          </p>
        </div>
      </Show>
    </>
  )
}

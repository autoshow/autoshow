import clsx from "clsx"
import { For,Show,createMemo } from "solid-js"
import { IMAGE_CONFIG } from "~/models"
import { IMAGE_PROMPT_CONFIG,IMAGE_PROMPT_TYPES } from "~/prompts/image-prompts"
import type {
SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate as CuratedModelCandidate,
SourceUtilsCostHelpersEstimatedDisplayCost as EstimatedDisplayCost,
ImageConfig,
SourceRoutesCreateStepsComponentsStep4WrapperImageImageEntry as ImageEntry,
ImageGenServiceType,
SourceRoutesCreateStepsComponentsStep4WrapperImageProps as Props
} from '~/types'
import { estimateImageDisplayCost,getResolvedPromptCount } from "~/utils/cost-helpers"
import {
ChoiceChip,
CuratedModelPicker,
OptionButton,
OptionGrid,
togglePrompt,
} from "../shared"
import { buildCandidateKey } from "../shared/curated-models"
import shared from "../shared/shared.module.css"
import s from "./Image.module.css"

function getImageEntries(config: ImageConfig): ImageEntry[] {
  return (Object.keys(config) as ImageGenServiceType[]).map((key) => [key, config[key]])
}

const imageServices = getImageEntries(IMAGE_CONFIG)

export default function Image(props: Props) {
  const imageConfig = createMemo(() => IMAGE_CONFIG[props.imageService])
  const imagePromptCount = createMemo(() => getResolvedPromptCount(props.selectedImagePrompts))

  const imageCandidates = createMemo(() => {
    return imageServices.flatMap(([serviceId, serviceConfig]) =>
      serviceConfig.models.map((model) => ({
        key: buildCandidateKey(serviceId, model.id),
        serviceId,
        serviceName: serviceConfig.name,
        modelId: model.id,
        modelName: model.name,
        description: model.description,
        speedProfile: model.speedProfile,
        quality: model.quality,
        costScore:
          estimateImageDisplayCost(
            serviceId,
            model.id,
            props.imageDimensionOrRatio,
            imagePromptCount()
          )?.usd ?? Number.POSITIVE_INFINITY,
        displayCost:
          estimateImageDisplayCost(
            serviceId,
            model.id,
            props.imageDimensionOrRatio,
            imagePromptCount()
          ) ?? null,
      }))
    ) satisfies Array<CuratedModelCandidate & { displayCost: EstimatedDisplayCost | null }>
  })

  const getCostLabel = (
    candidate: CuratedModelCandidate & { displayCost: EstimatedDisplayCost | null }
  ): string | undefined => {
    return candidate.displayCost ? `${candidate.displayCost.centsLabel}¢` : undefined
  }

  const handleImageModelClick = (serviceId: ImageGenServiceType, modelId: string) => {
    props.setImageService(serviceId)
    props.setImageModel(modelId)
  }

  return (
    <section class={s.mediaSection}>
      <div class={s.sectionHeader}>
        <h3 class={s.sectionTitle}>Image</h3>
        <p class={s.sectionDescription}>
          Configure the image generator, size, prompt type, and optional art direction.
        </p>
      </div>

      <fieldset class={clsx(shared.fieldset, s.imageFieldset)}>
        <legend class={shared.legend}>Select Image Model</legend>
        <CuratedModelPicker
          candidates={imageCandidates()}
          operation="image"
          selectedKey={buildCandidateKey(props.imageService, props.imageModel)}
          selectionActive={props.imageModelSelected}
          modelInputName="ui-image-model"
          disabled={props.disabled}
          onSelect={(candidate) =>
            handleImageModelClick(candidate.serviceId as ImageGenServiceType, candidate.modelId)
          }
          getCostLabel={getCostLabel}
        />
      </fieldset>

      <Show when={imageConfig()?.aspectRatios}>
        <fieldset class={clsx(shared.fieldset, s.imageFieldset)}>
          <legend class={shared.legend}>Select Aspect Ratio</legend>
          <div class={shared.choiceSet}>
            <For each={imageConfig()?.aspectRatios || []}>
              {(ratio) => (
                <ChoiceChip
                  name="ui-image-dimension"
                  value={ratio}
                  checked={props.imageDimensionSelected && props.imageDimensionOrRatio === ratio}
                  onChange={() => props.setImageDimensionOrRatio(ratio)}
                  disabled={props.disabled}
                >
                  {ratio}
                </ChoiceChip>
              )}
            </For>
          </div>
        </fieldset>
      </Show>

      <Show when={imageConfig()?.dimensions}>
        <fieldset class={clsx(shared.fieldset, s.imageFieldset)}>
          <legend class={shared.legend}>Select Dimensions</legend>
          <div class={shared.choiceSet}>
            <For each={imageConfig()?.dimensions || []}>
              {(dimension) => (
                <ChoiceChip
                  name="ui-image-dimension"
                  value={dimension.id}
                  checked={props.imageDimensionSelected && props.imageDimensionOrRatio === dimension.id}
                  onChange={() => props.setImageDimensionOrRatio(dimension.id)}
                  disabled={props.disabled}
                >
                  {dimension.name}
                </ChoiceChip>
              )}
            </For>
          </div>
        </fieldset>
      </Show>

      <fieldset class={clsx(shared.fieldset, s.imageFieldset)}>
        <legend class={shared.legend}>Select Image Prompt (1)</legend>
        <OptionGrid class={s.imagePromptGrid}>
          <For each={IMAGE_PROMPT_TYPES}>
            {(promptType) => {
              const config = () => IMAGE_PROMPT_CONFIG[promptType]
              return (
                <OptionButton
                  title={config().title}
                  description={config().description}
                  selected={props.imagePromptSelected && props.selectedImagePrompts.includes(promptType)}
                  name="ui-image-prompt"
                  value={promptType}
                  inputType="radio"
                  disabled={props.disabled}
                  onClick={() =>
                    togglePrompt(promptType, {
                      current: () => props.selectedImagePrompts,
                      setter: props.setSelectedImagePrompts,
                      maxItems: 1,
                    })
                  }
                  variant="simple"
                />
              )
            }}
          </For>
        </OptionGrid>
        <p class={clsx(shared.promptHelpText, s.imagePromptHelpText)}>
          Select 1 type of image to generate.{" "}
          {props.selectedImagePrompts.length > 0 &&
            `${props.selectedImagePrompts.length} of 1 selected.`}
        </p>
      </fieldset>

      <fieldset class={clsx(shared.fieldset, s.imageFieldset)}>
        <legend class={shared.legend}>Optional Custom Instructions</legend>
        <p class={shared.helpText}>
          Add extra art direction or composition guidance to append to the selected image prompt.
        </p>
        <textarea
          class={shared.textarea}
          value={props.imageCustomInstructions}
          onInput={(event) => props.setImageCustomInstructions(event.currentTarget.value)}
          placeholder="Example: Favor cinematic lighting, clean negative space, and a realistic editorial style."
          disabled={props.disabled}
        />
      </fieldset>
    </section>
  )
}

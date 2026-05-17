import clsx from "clsx"
import { For,Show,createMemo,createSignal } from "solid-js"
import { deriveSpeedLabel } from "~/models"
import type {
SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate as CuratedModelCandidate,
SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCategory as CuratedModelCategory,
SourceRoutesCreateStepsComponentsSharedCuratedModelPickerModelGridProps as ModelGridProps,
SourceRoutesCreateStepsComponentsSharedCuratedModelPickerProps as Props
} from '~/types'
import s from "./CuratedModelPicker.module.css"
import ModelButton from "./ModelButton"
import OptionButton from "./OptionButton"
import { getCuratedModelChoices } from "./curated-models"
import shared from "./shared.module.css"

function ModelGrid(props: ModelGridProps) {
  return (
    <div class={clsx(shared.selectableGrid, shared.selectableGridWide)}>
      {props.children}
    </div>
  )
}

const CATEGORY_LABELS: Record<CuratedModelCategory, string> = {
  cheapest: "Cheapest",
  fastest: "Fastest",
  highestQuality: "Highest Quality"
}

export default function CuratedModelPicker<T extends CuratedModelCandidate>(props: Props<T>) {
  const [expanded, setExpanded] = createSignal(false)
  const curatedInputName = () => props.curatedInputName ?? `${props.modelInputName}-curated-model`
  const selectionActive = () => props.selectionActive ?? true

  const choices = createMemo(() => getCuratedModelChoices(props.candidates, props.operation))

  const quickCandidates = createMemo(() => {
    const ranked = choices()
    return [
      { category: "cheapest" as const, candidate: ranked.cheapest },
      { category: "fastest" as const, candidate: ranked.fastest },
      { category: "highestQuality" as const, candidate: ranked.highestQuality }
    ]
  })

  const showAllModels = () => expanded()

  return (
    <>
      <div class={s.quickGrid}>
        <For each={quickCandidates()}>
          {(choice) => (
            <div class={s.quickOption} data-category={choice.category}>
              <span class={clsx(shared.pill, s.quickCategory)}>{CATEGORY_LABELS[choice.category]}</span>
              <OptionButton
                service={choice.candidate.serviceName}
                title={choice.candidate.modelName}
                description={choice.candidate.description && choice.candidate.description !== choice.candidate.modelName
                  ? choice.candidate.description
                  : undefined}
                costLabel={props.getCostLabel?.(choice.candidate)}
                selected={selectionActive() && !expanded() && props.selectedKey === choice.candidate.key}
                name={curatedInputName()}
                value={choice.category}
                inputType="checkbox"
                disabled={props.disabled}
                onClick={() => { setExpanded(false); props.onSelect(choice.candidate) }}
              >
                <Show when={choice.candidate.quality || deriveSpeedLabel(choice.candidate.speedProfile, props.operation)}>
                  <div class={shared.metaRow}>
                    <Show when={deriveSpeedLabel(choice.candidate.speedProfile, props.operation)}>
                      <span class={shared.metaChip}>
                        Speed: {deriveSpeedLabel(choice.candidate.speedProfile, props.operation)}
                      </span>
                    </Show>
                    <Show when={choice.candidate.quality}>
                      <span class={shared.metaChip}>Quality: {choice.candidate.quality}</span>
                    </Show>
                  </div>
                </Show>
                {props.renderAddon?.(choice.candidate)}
              </OptionButton>
            </div>
          )}
        </For>

        <div class={s.quickOption} data-category="all-models">
          <span class={clsx(shared.pill, s.quickCategory)}>
            Browse
          </span>
          <OptionButton
            title="All Models"
            description="Show every available model and choose directly."
            selected={showAllModels()}
            name={curatedInputName()}
            value="all-models"
            inputType="checkbox"
            disabled={props.disabled}
            onClick={() => { setExpanded(current => !current) }}
          >
            <span class={clsx(shared.metaChip, s.revealCount)}>{props.candidates.length} available</span>
          </OptionButton>
        </div>
      </div>

      <Show when={showAllModels()}>
        <ModelGrid>
          <For each={props.candidates}>
            {(candidate) => (
              <ModelButton
                service={candidate.serviceName}
                title={candidate.modelName}
                description={candidate.description}
                speedLabel={deriveSpeedLabel(candidate.speedProfile, props.operation)}
                quality={candidate.quality}
                costLabel={props.getCostLabel?.(candidate)}
                selected={selectionActive() && props.selectedKey === candidate.key}
                name={props.modelInputName}
                value={candidate.key}
                disabled={props.disabled}
                onClick={() => props.onSelect(candidate)}
              >
                {props.renderAddon?.(candidate)}
              </ModelButton>
            )}
          </For>
        </ModelGrid>
      </Show>
    </>
  )
}

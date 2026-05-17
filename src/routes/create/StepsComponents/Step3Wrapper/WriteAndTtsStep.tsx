import clsx from "clsx"
import { For,Match,Show,Switch } from "solid-js"
import { LLM_CONFIG,TTS_CONFIG } from "~/models"
import { PROMPT_CONFIG,PROMPT_TYPES } from "~/prompts/text-prompts/text-prompt-config"
import type {
SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate as CuratedModelCandidate,
SourceUtilsCostHelpersEstimatedDisplayCost as EstimatedDisplayCost,
SourceRoutesCreateStepsComponentsStep3WrapperWriteAndTtsStepGroupedPromptEntry as GroupedPromptEntry,
LLMServiceType,PromptType,
SourceRoutesCreateStepsComponentsStep3WrapperWriteAndTtsStepProps as Props,
SourceRoutesCreateStepsComponentsStep3WrapperWriteAndTtsStepRankedLLMCandidate as RankedLLMCandidate,
SourceRoutesCreateStepsComponentsStep3WrapperWriteAndTtsStepRankedTTSCandidate as RankedTTSCandidate,
TTSConfig,
SourceRoutesCreateStepsComponentsStep3WrapperWriteAndTtsStepTTSEntry as TTSEntry,
TTSServiceType
} from '~/types'
import { estimateLLMDisplayCost,estimateTTSDisplayCost } from "~/utils/cost-helpers"
import {
CuratedModelPicker,
OptionButton,
OptionGrid,
StepHeader,
togglePrompt,
} from "../shared"
import { buildCandidateKey } from "../shared/curated-models"
import shared from "../shared/shared.module.css"
import s from "./WriteAndTtsStep.module.css"

type CompactPromptOptionProps = {
  title: string
  description: string
  selected: boolean
  disabled: boolean | undefined
  onClick: () => void
  name: string
  value: string
}

const SUB_STEPS = {
  WRITE_DECISION: 0,
  PROMPT_SELECTION: 1,
  LLM_MODEL: 2,
  TTS_DECISION: 3,
  TTS_MODEL_VOICE: 4,
} as const

function getGroupedPromptEntries(): GroupedPromptEntry[] {
  const grouped: Record<string, PromptType[]> = {}

  for (const promptKey of PROMPT_TYPES) {
    const config = PROMPT_CONFIG[promptKey]
    if (!config) continue

    if (!grouped[config.category]) {
      grouped[config.category] = []
    }

    grouped[config.category]!.push(promptKey)
  }

  return Object.entries(grouped)
}

function getTTSEntries(config: TTSConfig): TTSEntry[] {
  return (Object.keys(config) as TTSServiceType[]).map((key) => [key, config[key]])
}

function isTTSServiceType(value: string): value is TTSServiceType {
  return value in TTS_CONFIG
}

function CompactPromptOption(props: CompactPromptOptionProps) {
  return (
    <label class={clsx(shared.selectableLabel, props.disabled && shared.selectableLabelDisabled)}>
      <input
        type="checkbox"
        name={props.name}
        value={props.value}
        checked={props.selected}
        onChange={() => props.onClick()}
        disabled={props.disabled}
        class={shared.hiddenControl}
      />
      <span
        class={clsx(
          shared.selectableSurface,
          s.promptOptionSurface,
          props.selected && shared.selectableSurfaceSelected,
        )}
      >
        <span class={s.promptOptionTitle}>{props.title}</span>
        <span class={s.promptOptionDescription}>{props.description}</span>
      </span>
    </label>
  )
}

export default function WriteAndTtsStep(props: Props) {
  const groupedPromptEntries = getGroupedPromptEntries()
  const ttsServices = getTTSEntries(TTS_CONFIG)
  const isAppendMode = () => props.mode === 'append-assets'

  const selectedPromptTitles = () => {
    return props.selectedPrompts.map((promptKey) => {
      return PROMPT_CONFIG[promptKey as PromptType]?.title ?? promptKey
    })
  }

  const llmCandidates = () => {
    return Object.entries(LLM_CONFIG).flatMap(([providerId, config]) =>
      config.models.map((model) => ({
        key: buildCandidateKey(providerId, model.id),
        serviceId: providerId,
        serviceName: config.name,
        modelId: model.id,
        modelName: model.name,
        description: model.description,
        speedProfile: model.speedProfile,
        quality: model.quality,
        costScore: estimateLLMDisplayCost(
          providerId as LLMServiceType,
          model.id,
          props.selectedPrompts,
          props.durationSeconds
        )?.usd ?? Number.POSITIVE_INFINITY,
        displayCost: estimateLLMDisplayCost(
          providerId as LLMServiceType,
          model.id,
          props.selectedPrompts,
          props.durationSeconds
        ) ?? null,
      }))
    ) satisfies RankedLLMCandidate[]
  }

  const ttsCandidates = (): RankedTTSCandidate[] => {
    return ttsServices.flatMap(([serviceId, serviceConfig]) =>
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
          estimateTTSDisplayCost(serviceId, model.id, props.selectedPrompts)?.usd ??
          Number.POSITIVE_INFINITY,
        displayCost:
          estimateTTSDisplayCost(serviceId, model.id, props.selectedPrompts) ?? null,
      }))
    )
  }

  const currentVoices = () => {
    if (!isTTSServiceType(props.ttsService)) return []
    return TTS_CONFIG[props.ttsService]?.voices ?? []
  }

  const getCostLabel = (
    candidate: CuratedModelCandidate & { displayCost: EstimatedDisplayCost | null }
  ): string | undefined => {
    return candidate.displayCost ? `${candidate.displayCost.centsLabel}¢` : undefined
  }

  const handleTTSModelClick = (serviceId: TTSServiceType, modelId: string) => {
    props.setTtsService(serviceId)
    props.setTtsModel(modelId)

    const firstVoice = TTS_CONFIG[serviceId].voices[0]
    if (firstVoice) {
      props.setTtsVoice(firstVoice.id)
    }
  }

  return (
    <>
      <StepHeader
        stepNumber={props.stepNumber}
        title="Write and TTS"
        description={isAppendMode()
          ? "Choose whether to generate more text, narration from the latest text, or skip this stage."
          : "Choose whether to generate text and narration. Each choice is a separate step."}
      />

      <Switch>
        <Match when={props.subStep === SUB_STEPS.WRITE_DECISION}>
          <fieldset class={shared.fieldset}>
            <legend class={shared.legend}>Mode</legend>
            <div class={s.modeSection}>
              <OptionGrid>
                <OptionButton
                  title="Skip"
                  description="Do not run the writing stage."
                  selected={props.writeModeSelected && !props.llmEnabled && !props.ttsWithLlm}
                  name="ui-write-mode"
                  value="skip"
                  inputType="radio"
                  disabled={props.disabled}
                  onClick={() => props.setWriteMode("skip")}
                  variant="simple"
                />
                <Show when={isAppendMode()}>
                  <OptionButton
                    title="TTS"
                    description="Create narration from the latest available text output."
                    selected={props.writeModeSelected && !props.llmEnabled && props.ttsWithLlm}
                    name="ui-write-mode"
                    value="tts-only"
                    inputType="radio"
                    disabled={props.disabled}
                    onClick={() => props.setWriteMode("tts-only")}
                    variant="simple"
                  />
                </Show>
                <OptionButton
                  title="LLM"
                  description="Generate structured text outputs with an LLM."
                  selected={props.writeModeSelected && props.llmEnabled}
                  name="ui-write-mode"
                  value="llm"
                  inputType="radio"
                  disabled={props.disabled}
                  onClick={() => props.setWriteMode("llm")}
                  variant="simple"
                />
              </OptionGrid>
              <p class={s.modeHint}>
                {isAppendMode()
                  ? "`Skip` advances immediately. `TTS` reuses the latest text. `LLM` requires at least one prompt and a model."
                  : "`Skip` advances immediately. `LLM` requires at least one prompt and a model."}
              </p>
            </div>
          </fieldset>

        </Match>

        <Match when={props.subStep === SUB_STEPS.PROMPT_SELECTION}>
          <fieldset class={shared.fieldset}>
            <legend class={shared.legend}>Select Prompts</legend>
            <div class={s.promptSelectorHeader}>
              <p class={shared.helpText}>
                Pick one or more prompt outputs. The LLM model and TTS estimates update from
                these selections.
              </p>
              <div class={s.promptSummary}>
                <span class={clsx(shared.pill, shared.pillNumeric, s.promptGroupCount)}>
                  {props.selectedPrompts.length} selected
                </span>
                <Show when={selectedPromptTitles().length > 0}>
                  <div class={s.promptTagList}>
                    <For each={selectedPromptTitles()}>
                      {(title) => <span class={clsx(shared.pill, s.promptTag)}>{title}</span>}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
            <div class={s.promptPanel}>
              <For each={groupedPromptEntries}>
                {(entry) => {
                  const category = () => entry[0]
                  const prompts = () => entry[1]
                  return (
                    <section class={clsx(shared.panelShellSubtle, s.promptGroup)}>
                      <div class={s.promptGroupHeader}>
                        <h3 class={s.promptGroupTitle}>{category()}</h3>
                      </div>
                      <div class={s.promptOptionGrid}>
                        <For each={prompts()}>
                          {(promptKey) => {
                            const config = () => PROMPT_CONFIG[promptKey]
                            return (
                              <CompactPromptOption
                                title={config().title}
                                description={config().schema.description}
                                selected={props.selectedPrompts.includes(promptKey)}
                                name="ui-selected-prompt"
                                value={promptKey}
                                disabled={props.disabled}
                                onClick={() =>
                                  togglePrompt(promptKey, {
                                    current: () => props.selectedPrompts,
                                    setter: props.setSelectedPrompts,
                                  })
                                }
                              />
                            )
                          }}
                        </For>
                      </div>
                    </section>
                  )
                }}
              </For>
            </div>
          </fieldset>
        </Match>

        <Match when={props.subStep === SUB_STEPS.LLM_MODEL}>
          <fieldset class={shared.fieldset}>
            <legend class={shared.legend}>Select LLM Model</legend>
            <CuratedModelPicker
              candidates={llmCandidates()}
              operation="llm"
              selectedKey={buildCandidateKey(props.llmService, props.llmModel)}
              selectionActive={props.llmModelSelected}
              modelInputName="ui-llm-model"
              disabled={props.disabled}
              onSelect={(candidate) => {
                props.setLlmService(candidate.serviceId as LLMServiceType)
                props.setLlmModel(candidate.modelId)
              }}
              getCostLabel={getCostLabel}
            />
          </fieldset>

          <fieldset class={shared.fieldset}>
            <legend class={shared.legend}>Optional Custom Instructions</legend>
            <p class={shared.helpText}>
              Add extra guidance that should be appended to every selected LLM prompt in this run.
            </p>
            <textarea
              class={shared.textarea}
              value={props.llmCustomInstructions}
              onInput={(event) => props.setLlmCustomInstructions(event.currentTarget.value)}
              placeholder="Example: Keep the tone analytical, include counterarguments, and avoid marketing language."
              disabled={props.disabled}
            />
          </fieldset>
        </Match>

        <Match when={props.subStep === SUB_STEPS.TTS_DECISION}>
          <fieldset class={shared.fieldset}>
            <legend class={shared.legend}>TTS</legend>
            <div class={s.modeSection}>
              <OptionGrid>
                <OptionButton
                  title="Skip TTS"
                  description="Proceed without narration."
                  selected={props.ttsDecisionMade && !props.ttsWithLlm}
                  name="ui-tts-decision"
                  value="skip"
                  inputType="radio"
                  disabled={props.disabled}
                  onClick={() => props.setTtsDecision(false)}
                  variant="simple"
                />
                <OptionButton
                  title="Pick TTS"
                  description="Convert text outputs to spoken narration."
                  selected={props.ttsDecisionMade && props.ttsWithLlm}
                  name="ui-tts-decision"
                  value="pick"
                  inputType="radio"
                  disabled={props.disabled}
                  onClick={() => props.setTtsDecision(true)}
                  variant="simple"
                />
              </OptionGrid>
            </div>
          </fieldset>
        </Match>

        <Match when={props.subStep === SUB_STEPS.TTS_MODEL_VOICE}>
          <fieldset class={shared.fieldset}>
            <legend class={shared.legend}>Select TTS Model</legend>
            <CuratedModelPicker
              candidates={ttsCandidates()}
              operation="tts"
              selectedKey={buildCandidateKey(props.ttsService, props.ttsModel)}
              selectionActive={props.ttsModelSelected}
              modelInputName="ui-tts-model"
              disabled={props.disabled}
              onSelect={(candidate) =>
                handleTTSModelClick(candidate.serviceId as TTSServiceType, candidate.modelId)
              }
              getCostLabel={getCostLabel}
            />
          </fieldset>

          <fieldset class={shared.fieldset}>
            <legend class={shared.legend}>Select Voice</legend>
            <OptionGrid>
              <For each={currentVoices()}>
                {(voice) => (
                  <OptionButton
                    title={voice.name}
                    description={voice.description}
                    selected={props.ttsVoiceSelected && props.ttsVoice === voice.id}
                    name="ui-tts-voice"
                    value={voice.id}
                    inputType="radio"
                    disabled={props.disabled}
                    onClick={() => props.setTtsVoice(voice.id)}
                    variant="simple"
                  />
                )}
              </For>
            </OptionGrid>
          </fieldset>
        </Match>
      </Switch>
    </>
  )
}

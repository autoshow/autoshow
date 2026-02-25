import { For } from "solid-js"
import s from "./Step3.module.css"
import { StepHeader, OptionButton, OptionGrid, togglePrompt } from "../shared"
import { PROMPT_CONFIG, PROMPT_TYPES } from "~/prompts/text-prompts/text-prompt-config"
import type { PromptType } from "~/types"

type Props = {
  selectedPrompts: string[]
  setSelectedPrompts: (prompts: string[]) => void
  disabled: boolean | undefined
}

type GroupedPromptEntry = [string, PromptType[]]

function getGroupedPromptEntries(): GroupedPromptEntry[] {
  const grouped: Record<string, PromptType[]> = {}
  for (const promptKey of PROMPT_TYPES) {
    const config = PROMPT_CONFIG[promptKey]
    if (!config) continue
    const { category } = config
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(promptKey)
  }
  return Object.entries(grouped)
}

export default function Step3(props: Props) {
  const groupedPromptEntries = getGroupedPromptEntries()

  return (
    <>
      <StepHeader
        stepNumber={3}
        title="Select Content to Generate"
        description="Select at least one option. You can choose any combination."
      />

      <input
        type="hidden"
        name="selectedPrompts"
        value={props.selectedPrompts.join(',')}
      />

      <For each={groupedPromptEntries}>
        {([category, prompts]) => (
          <div class={s.categorySection}>
            <h3 class={s.categoryHeading}>{category}</h3>

            <OptionGrid>
              <For each={prompts}>
                {(promptKey) => {
                  const config = PROMPT_CONFIG[promptKey]
                  if (!config) return null

                  return (
                    <OptionButton
                      title={config.title}
                      description={config.schema.description}
                      selected={props.selectedPrompts.includes(promptKey)}
                      disabled={props.disabled}
                      onClick={() => togglePrompt(promptKey, { current: () => props.selectedPrompts, setter: props.setSelectedPrompts })}
                    />
                  )
                }}
              </For>
            </OptionGrid>
          </div>
        )}
      </For>
    </>
  )
}

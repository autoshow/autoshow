import s from "./Step3.module.css"
import { PROMPT_SECTIONS } from "~/prompts/text-prompts"
import { PROMPT_METADATA } from "~/prompts/prompt-metadata"

type Props = {
  selectedPrompts: string[]
  setSelectedPrompts: (prompts: string[]) => void
  disabled: boolean | undefined
}

export default function Step3(props: Props) {
  const togglePrompt = (prompt: string): void => {
    const current = props.selectedPrompts
    if (current.includes(prompt)) {
      props.setSelectedPrompts(current.filter(p => p !== prompt))
    } else {
      props.setSelectedPrompts([...current, prompt])
    }
  }

  const promptKeys = Object.keys(PROMPT_SECTIONS)

  const groupedPrompts = promptKeys.reduce((acc, promptKey) => {
    const metadata = PROMPT_METADATA[promptKey]
    if (!metadata) return acc

    const { category } = metadata
    
    if (!acc[category]) {
      acc[category] = []
    }
    
    acc[category].push(promptKey)
    return acc
  }, {} as Record<string, string[]>)

  return (
    <>
      <h2 class={s.stepHeading}>Step 3: Select Content to Generate</h2>
      <p class={s.promptHelpText}>
        Select at least one option. You can choose any combination.
      </p>

      <input 
        type="hidden" 
        name="selectedPrompts" 
        value={props.selectedPrompts.join(',')} 
      />

      {Object.entries(groupedPrompts).map(([category, prompts]) => (
        <div class={s.categorySection}>
          <h3 class={s.categoryHeading}>{category}</h3>
          
          <div class={s.optionGrid}>
            {prompts.map((promptKey) => {
              const metadata = PROMPT_METADATA[promptKey]
              if (!metadata) return null

              return (
                <button
                  type="button"
                  class={props.selectedPrompts.includes(promptKey) ? s.optionButtonSelected : s.optionButton}
                  onClick={() => togglePrompt(promptKey)}
                  disabled={props.disabled}
                >
                  <div class={s.optionTitle}>{metadata.title}</div>
                  <div class={s.optionDescription}>
                    {metadata.description}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}
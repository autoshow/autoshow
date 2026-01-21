import { Show, For } from "solid-js"
import s from "./Step6.module.css"
import { l } from "~/utils/logging"

type Props = {
  imageGenSkipped: boolean
  setImageGenSkipped: (value: boolean) => void
  selectedImagePrompts: string[]
  setSelectedImagePrompts: (prompts: string[]) => void
  disabled: boolean | undefined
}

export default function Step6(props: Props) {
  const togglePrompt = (prompt: string): void => {
    const current = props.selectedImagePrompts
    
    if (current.includes(prompt)) {
      const newPrompts = current.filter(p => p !== prompt)
      props.setSelectedImagePrompts(newPrompts)
    } else {
      if (current.length < 3) {
        const newPrompts = [...current, prompt]
        props.setSelectedImagePrompts(newPrompts)
      } else {
        l(`[Step6] Cannot add prompt - limit of 3 reached`)
      }
    }
  }

  const imagePromptOptions = [
    {
      id: "keyMoment",
      title: "Key Moment",
      description: "Generate an image representing the most important moment or concept from the content"
    },
    {
      id: "thumbnail",
      title: "Thumbnail",
      description: "Create an eye-catching thumbnail image suitable for social media or video platforms"
    },
    {
      id: "conceptual",
      title: "Conceptual Art",
      description: "Generate abstract or conceptual artwork that captures the essence of the discussion"
    },
    {
      id: "infographic",
      title: "Infographic Style",
      description: "Create an infographic-style image summarizing key points visually"
    },
    {
      id: "character",
      title: "Character/Scene",
      description: "Generate an image of characters or scenes discussed in the content"
    },
    {
      id: "quote",
      title: "Quote Visual",
      description: "Create a visual representation of a memorable quote from the content"
    }
  ]

  return (
    <>
      <h2 class={s.stepHeading}>Step 6: AI Image Generation (Optional)</h2>

      <div class={s.instructionBanner}>
        Optionally create AI-generated images based on your content. Select 1-3 image types to generate.
      </div>

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

      <div class={s.formGroup}>
        <label class={s.checkboxLabel}>
          <input
            type="checkbox"
            checked={props.imageGenSkipped}
            onChange={(e) => props.setImageGenSkipped(e.currentTarget.checked)}
            disabled={props.disabled}
            class={s.checkbox}
          />
          <span class={s.checkboxText}>Skip AI image generation</span>
        </label>
        <p class={s.helpText}>
          Check this box to skip generating AI images based on your content.
        </p>
      </div>

      <Show when={!props.imageGenSkipped}>
        <div class={s.formGroup}>
          <label class={s.label}>
            Select Image Prompts (1-3)
          </label>
          
          <div class={s.optionGrid}>
            <For each={imagePromptOptions}>
              {(option) => {
                const isSelected = () => props.selectedImagePrompts.includes(option.id)
                
                return (
                  <button
                    type="button"
                    class={isSelected() ? s.optionButtonSelected : s.optionButton}
                    onClick={() => {
                      togglePrompt(option.id)
                    }}
                    disabled={props.disabled}
                  >
                    <div class={s.optionTitle}>{option.title}</div>
                    <div class={s.optionDescription}>{option.description}</div>
                  </button>
                )
              }}
            </For>
          </div>

          <p class={s.promptHelpText}>
            Select up to 3 types of images to generate. {props.selectedImagePrompts.length > 0 && `${props.selectedImagePrompts.length} of 3 selected.`}
          </p>
        </div>
      </Show>
    </>
  )
}
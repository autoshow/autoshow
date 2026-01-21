import { Show, For } from "solid-js"
import s from "./Step7.module.css"
import { SERVICES_CONFIG } from "~/utils/services"

type Props = {
  musicGenSkipped: boolean
  setMusicGenSkipped: (value: boolean) => void
  selectedMusicGenre: string
  setSelectedMusicGenre: (genre: string) => void
  disabled: boolean | undefined
}

export default function Step7(props: Props) {
  return (
    <>
      <h2 class={s.stepHeading}>Step 7: Music Generation (Optional)</h2>

      <div class={s.instructionBanner}>
        Optionally generate an original music track with AI-composed lyrics based on your content.
      </div>

      <input 
        type="hidden" 
        name="musicGenSkipped" 
        value={props.musicGenSkipped ? "true" : "false"} 
      />

      <input 
        type="hidden" 
        name="selectedMusicGenre" 
        value={props.selectedMusicGenre} 
      />

      <div class={s.formGroup}>
        <label class={s.checkboxLabel}>
          <input
            type="checkbox"
            checked={props.musicGenSkipped}
            onChange={(e) => props.setMusicGenSkipped(e.currentTarget.checked)}
            disabled={props.disabled}
            class={s.checkbox}
          />
          <span class={s.checkboxText}>Skip music generation</span>
        </label>
        <p class={s.helpText}>
          Check this box to skip generating an AI-composed music track based on your content.
        </p>
      </div>

      <Show when={!props.musicGenSkipped}>
        <div class={s.formGroup}>
          <label class={s.label}>
            Select Music Genre
          </label>
          
          <div class={s.optionGrid}>
            <For each={SERVICES_CONFIG.music.elevenlabs.genres}>
              {(genre) => {
                const isSelected = () => props.selectedMusicGenre === genre.id
                
                return (
                  <button
                    type="button"
                    class={isSelected() ? s.optionButtonSelected : s.optionButton}
                    onClick={() => props.setSelectedMusicGenre(genre.id)}
                    disabled={props.disabled}
                  >
                    <div class={s.optionTitle}>{genre.name}</div>
                    <div class={s.optionDescription}>{genre.description}</div>
                  </button>
                )
              }}
            </For>
          </div>

          <p class={s.promptHelpText}>
            Select the musical style for your AI-generated track.
          </p>
        </div>
      </Show>
    </>
  )
}
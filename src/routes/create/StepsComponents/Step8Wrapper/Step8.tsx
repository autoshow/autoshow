import { Show, For } from "solid-js"
import s from "./Step8.module.css"
import { SERVICES_CONFIG } from "~/utils/services"
import { l } from "~/utils/logging"

type Props = {
  videoGenSkipped: boolean
  setVideoGenSkipped: (value: boolean) => void
  selectedVideoPrompts: string[]
  setSelectedVideoPrompts: (prompts: string[]) => void
  videoModel: string
  setVideoModel: (model: string) => void
  videoSize: string
  setVideoSize: (size: string) => void
  videoDuration: number
  setVideoDuration: (duration: number) => void
  disabled: boolean | undefined
}

export default function Step8(props: Props) {
  const togglePrompt = (prompt: string): void => {
    const current = props.selectedVideoPrompts

    if (current.includes(prompt)) {
      const newPrompts = current.filter(p => p !== prompt)
      props.setSelectedVideoPrompts(newPrompts)
    } else {
      if (current.length < 3) {
        const newPrompts = [...current, prompt]
        props.setSelectedVideoPrompts(newPrompts)
      } else {
        l(`[Step8] Cannot add prompt - limit of 3 reached`)
      }
    }
  }

  const videoPromptOptions = [
    {
      id: "explainer",
      title: "Explainer",
      description: "Educational video that visually demonstrates key concepts from the content"
    },

    {
      id: "highlight",
      title: "Highlight Reel",
      description: "Dynamic montage showcasing the most important moments"
    },
    {
      id: "intro",
      title: "Intro Sequence",
      description: "Professional opening sequence to introduce the content"
    },
    {
      id: "outro",
      title: "Outro Sequence",
      description: "Closing sequence that summarizes and wraps up the content"
    },
    {
      id: "social",
      title: "Social Clip",
      description: "Short, engaging clip optimized for social media platforms"
    }
  ]

  return (
    <>
      <h2 class={s.stepHeading}>Step 8: AI Video Generation (Optional)</h2>

      <div class={s.instructionBanner}>
        Optionally create AI-generated videos using OpenAI Sora. Select 1-3 video types to generate.
      </div>

      <input
        type="hidden"
        name="videoGenSkipped"
        value={props.videoGenSkipped ? "true" : "false"}
      />

      <input
        type="hidden"
        name="selectedVideoPrompts"
        value={props.selectedVideoPrompts.join(',')}
      />

      <input
        type="hidden"
        name="videoModel"
        value={props.videoModel}
      />

      <input
        type="hidden"
        name="videoSize"
        value={props.videoSize}
      />

      <input
        type="hidden"
        name="videoDuration"
        value={props.videoDuration.toString()}
      />

      <div class={s.formGroup}>
        <label class={s.checkboxLabel}>
          <input
            type="checkbox"
            checked={props.videoGenSkipped}
            onChange={(e) => props.setVideoGenSkipped(e.currentTarget.checked)}
            disabled={props.disabled}
            class={s.checkbox}
          />
          <span class={s.checkboxText}>Skip AI video generation</span>
        </label>
        <p class={s.helpText}>
          Check this box to skip generating AI videos. Video generation can take several minutes per video.
        </p>
      </div>

      <Show when={!props.videoGenSkipped}>
        {/* Model Selection */}
        <div class={s.formGroup}>
          <label class={s.label}>Select Video Model</label>
          <div class={s.modelGrid}>
            <For each={SERVICES_CONFIG.videoGen.openai.models}>
              {(model) => {
                const isSelected = () => props.videoModel === model.id
                return (
                  <button
                    type="button"
                    class={isSelected() ? s.modelButtonSelected : s.modelButton}
                    onClick={() => props.setVideoModel(model.id)}
                    disabled={props.disabled}
                  >
                    <div class={s.modelHeader}>
                      <span class={s.modelTitle}>{model.name}</span>
                      <div class={s.modelGrades}>
                        <span class={s.grade} title="Speed">Speed: {model.speed}</span>
                        <span class={s.grade} title="Quality">Quality: {model.quality}</span>
                      </div>
                    </div>
                    <div class={s.modelDescription}>{model.description}</div>
                  </button>
                )
              }}
            </For>
          </div>
        </div>

        {/* Video Size Selection */}
        <div class={s.formGroup}>
          <label class={s.label}>Select Video Size</label>
          <div class={s.sizeGrid}>
            <For each={SERVICES_CONFIG.videoGen.openai.sizes}>
              {(size) => {
                const isSelected = () => props.videoSize === size.id
                return (
                  <button
                    type="button"
                    class={isSelected() ? s.sizeButtonSelected : s.sizeButton}
                    onClick={() => props.setVideoSize(size.id)}
                    disabled={props.disabled}
                  >
                    <div class={s.sizeTitle}>{size.name}</div>
                    <div class={s.sizeDescription}>{size.description}</div>
                  </button>
                )
              }}
            </For>
          </div>
        </div>

        {/* Duration Selection */}
        <div class={s.formGroup}>
          <label class={s.label}>Select Video Duration</label>
          <div class={s.durationGrid}>
            <For each={SERVICES_CONFIG.videoGen.openai.durations}>
              {(duration) => {
                const isSelected = () => props.videoDuration === duration
                return (
                  <button
                    type="button"
                    class={isSelected() ? s.durationButtonSelected : s.durationButton}
                    onClick={() => props.setVideoDuration(duration)}
                    disabled={props.disabled}
                  >
                    {duration}s
                  </button>
                )
              }}
            </For>
          </div>
          <p class={s.helpText}>
            Longer videos take more time to generate and cost more.
          </p>
        </div>

        {/* Video Prompt Type Selection */}
        <div class={s.formGroup}>
          <label class={s.label}>Select Video Types (1-3)</label>

          <div class={s.optionGrid}>
            <For each={videoPromptOptions}>
              {(option) => {
                const isSelected = () => props.selectedVideoPrompts.includes(option.id)

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
            Select up to 3 types of videos to generate. {props.selectedVideoPrompts.length > 0 && `${props.selectedVideoPrompts.length} of 3 selected.`}
          </p>
        </div>
      </Show>
    </>
  )
}

import { Show, For } from "solid-js"
import shared from "../shared/shared.module.css"
import s from "./VideoOptions.module.css"
import type { VideoGenServiceType } from "~/types"

type VideoSize = {
  id: string
  name: string
  description: string
}

type Props = {
  videoService: VideoGenServiceType
  videoSize: string
  setVideoSize: (size: string) => void
  videoDuration: number
  setVideoDuration: (duration: number) => void
  videoAspectRatio: string
  setVideoAspectRatio: (ratio: string) => void
  disabled: boolean | undefined
  sizes: VideoSize[]
  durations: number[]
  aspectRatios?: string[] | undefined
}

export default function VideoOptions(props: Props) {
  const handleSizeChange = (sizeId: string) => {
    props.setVideoSize(sizeId)
    if (props.videoService === 'gemini' && (sizeId === '1080p' || sizeId === '4k')) {
      props.setVideoDuration(8)
    }
  }

  const handleDurationChange = (duration: number) => {
    if (props.videoService === 'gemini') {
      const size = props.videoSize
      if ((size === '1080p' || size === '4k') && duration !== 8) {
        return
      }
    }
    props.setVideoDuration(duration)
  }

  return (
    <>
      <div class={shared.formGroup}>
        <label class={shared.label}>Select Video Size</label>
        <div class={s.sizeGrid}>
          <For each={props.sizes}>
            {(size) => {
              const isSelected = () => props.videoSize === size.id
              return (
                <button
                  type="button"
                  class={isSelected() ? s.sizeButtonSelected : s.sizeButton}
                  onClick={() => handleSizeChange(size.id)}
                  disabled={props.disabled}
                >
                  <div class={s.sizeTitle}>{size.name}</div>
                  <div class={s.sizeDescription}>{size.description}</div>
                </button>
              )
            }}
          </For>
        </div>
        <Show when={props.videoService === 'gemini' && (props.videoSize === '1080p' || props.videoSize === '4k')}>
          <p class={shared.helpText}>
            Note: {props.videoSize} resolution requires 8-second duration.
          </p>
        </Show>
      </div>

      <Show when={props.videoService === 'gemini' && props.aspectRatios}>
        <div class={shared.formGroup}>
          <label class={shared.label}>Select Aspect Ratio</label>
          <div class={shared.aspectRatioGrid}>
            <For each={props.aspectRatios || []}>
              {(ratio) => {
                const isSelected = () => props.videoAspectRatio === ratio
                return (
                  <button
                    type="button"
                    class={isSelected() ? shared.aspectRatioButtonSelected : shared.aspectRatioButton}
                    onClick={() => props.setVideoAspectRatio(ratio)}
                    disabled={props.disabled}
                  >
                    {ratio === '16:9' ? 'Landscape (16:9)' : 'Portrait (9:16)'}
                  </button>
                )
              }}
            </For>
          </div>
        </div>
      </Show>

      <div class={shared.formGroup}>
        <label class={shared.label}>Select Video Duration</label>
        <div class={s.durationGrid}>
          <For each={props.durations}>
            {(duration) => {
              const isSelected = () => props.videoDuration === duration
              const isDisabled = () => {
                if (props.videoService === 'gemini') {
                  const size = props.videoSize
                  if ((size === '1080p' || size === '4k') && duration !== 8) {
                    return true
                  }
                }
                return false
              }
              return (
                <button
                  type="button"
                  class={isSelected() ? s.durationButtonSelected : isDisabled() ? s.durationButtonDisabled : s.durationButton}
                  onClick={() => handleDurationChange(duration)}
                  disabled={props.disabled || isDisabled()}
                >
                  {duration}s
                </button>
              )
            }}
          </For>
        </div>
        <p class={shared.helpText}>
          Longer videos take more time to generate and cost more.
        </p>
      </div>
    </>
  )
}

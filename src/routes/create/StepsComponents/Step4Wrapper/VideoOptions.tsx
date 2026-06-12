import clsx from "clsx"
import { For,Show } from "solid-js"
import { requiresExplicitVideoAspectRatioSelection } from "~/models"
import type { SourceRoutesCreateStepsComponentsStep4WrapperVideoOptionsProps as Props } from '~/types'
import { ChoiceChip,OptionButton } from "../shared"
import shared from "../shared/shared.module.css"
import s from "./VideoOptions.module.css"

export default function VideoOptions(props: Props) {
  const fieldsetClass = () =>
    props.fieldsetClass ? clsx(shared.fieldset, props.fieldsetClass) : shared.fieldset

  const handleSizeChange = (sizeId: string) => {
    props.setVideoSize(sizeId)
    if (props.videoService === "gemini" && (sizeId === "1080p" || sizeId === "4k")) {
      props.setVideoDuration(8)
    }
  }

  const handleDurationChange = (duration: number) => {
    if (props.videoService === "gemini") {
      const size = props.videoSize
      if ((size === "1080p" || size === "4k") && duration !== 8) {
        return
      }
    }
    props.setVideoDuration(duration)
  }

  return (
    <>
      <fieldset class={fieldsetClass()}>
        <legend class={shared.legend}>Select Video Size</legend>
        <div class={s.sizeGrid}>
          <For each={props.sizes}>
            {(size) => {
              const isSelected = () => props.videoSizeSelected && props.videoSize === size.id
              return (
                <OptionButton
                  title={size.name}
                  description={size.description}
                  selected={isSelected()}
                  name="ui-video-size"
                  value={size.id}
                  inputType="radio"
                  onClick={() => handleSizeChange(size.id)}
                  disabled={props.disabled}
                  variant="simple"
                />
              )
            }}
          </For>
        </div>
        <Show
          when={
            props.videoService === "gemini" &&
            (props.videoSize === "1080p" || props.videoSize === "4k")
          }
        >
          <p class={clsx(shared.helpText, s.optionHelpText)}>
            Note: {props.videoSize} resolution requires 8 seconds.
          </p>
        </Show>
      </fieldset>

      <Show when={requiresExplicitVideoAspectRatioSelection(props.videoService) && props.aspectRatios}>
        <fieldset class={fieldsetClass()}>
          <legend class={shared.legend}>Select Aspect Ratio</legend>
          <div class={shared.choiceSet}>
            <For each={props.aspectRatios || []}>
              {(ratio) => {
                const isSelected = () => props.videoAspectRatioSelected && props.videoAspectRatio === ratio
                return (
                  <ChoiceChip
                    name="ui-video-aspect-ratio"
                    value={ratio}
                    checked={isSelected()}
                    onChange={() => props.setVideoAspectRatio(ratio)}
                    disabled={props.disabled}
                  >
                    {ratio === "16:9" ? "Landscape (16:9)" : "Portrait (9:16)"}
                  </ChoiceChip>
                )
              }}
            </For>
          </div>
        </fieldset>
      </Show>

      <fieldset class={fieldsetClass()}>
        <legend class={shared.legend}>Select Video Duration</legend>
        <div class={s.durationGrid}>
          <For each={props.durations}>
            {(duration) => {
              const isSelected = () => props.videoDurationSelected && props.videoDuration === duration
              const isDisabled = () => {
                if (props.videoService === "gemini") {
                  const size = props.videoSize
                  if ((size === "1080p" || size === "4k") && duration !== 8) {
                    return true
                  }
                }
                return false
              }

              return (
                <ChoiceChip
                  name="ui-video-duration"
                  value={duration.toString()}
                  checked={isSelected()}
                  onChange={() => handleDurationChange(duration)}
                  disabled={props.disabled || isDisabled()}
                >
                  {duration}s
                </ChoiceChip>
              )
            }}
          </For>
        </div>
        <p class={clsx(shared.helpText, s.optionHelpText)}>
          Longer videos take more time to generate and cost more.
        </p>
      </fieldset>
    </>
  )
}

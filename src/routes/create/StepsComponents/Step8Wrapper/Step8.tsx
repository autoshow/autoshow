import { Show, For, createMemo } from "solid-js"
import shared from "../shared/shared.module.css"
import { StepHeader, SkipCheckbox, OptionButton, OptionGrid, ModelButton, ModelGrid, togglePrompt } from "../shared"
import { VIDEO_CONFIG } from "~/models"
import { VIDEO_PROMPT_CONFIG, VIDEO_PROMPT_TYPES } from "~/prompts/video-prompts"
import VideoOptions from "./VideoOptions"
import type { VideoGenServiceType, VideoConfig } from "~/types"

type Props = {
  videoGenSkipped: boolean
  setVideoGenSkipped: (value: boolean) => void
  videoService: VideoGenServiceType
  setVideoService: (service: VideoGenServiceType) => void
  selectedVideoPrompts: string[]
  setSelectedVideoPrompts: (prompts: string[]) => void
  videoModel: string
  setVideoModel: (model: string) => void
  videoSize: string
  setVideoSize: (size: string) => void
  videoDuration: number
  setVideoDuration: (duration: number) => void
  videoAspectRatio: string
  setVideoAspectRatio: (ratio: string) => void
  disabled: boolean | undefined
}

type VideoEntry = [VideoGenServiceType, NonNullable<VideoConfig[VideoGenServiceType]>]

function getVideoEntries(config: VideoConfig): VideoEntry[] {
  return (Object.keys(config) as VideoGenServiceType[])
    .filter(key => config[key] !== undefined)
    .map(key => [key, config[key]!])
}

export default function Step8(props: Props) {
  const currentConfig = createMemo(() => VIDEO_CONFIG[props.videoService])

  const videoServices = getVideoEntries(VIDEO_CONFIG)

  const handleModelClick = (serviceId: VideoGenServiceType, modelId: string) => {
    props.setVideoService(serviceId)
    props.setVideoModel(modelId)
    const config = VIDEO_CONFIG[serviceId]
    if (config) {
      props.setVideoSize(config.sizes[0]?.id || '')
      props.setVideoDuration(config.durations[0] || 8)
      if (config.aspectRatios) {
        props.setVideoAspectRatio(config.aspectRatios[0] || '16:9')
      }
    }
  }

  const isModelSelected = (serviceId: VideoGenServiceType, modelId: string): boolean => {
    return props.videoService === serviceId && props.videoModel === modelId
  }

  return (
    <>
      <StepHeader
        stepNumber={8}
        title="AI Video Generation (Optional)"
        description="Optionally create AI-generated videos using OpenAI Sora, Gemini Veo, MiniMax, or Grok."
      />

      <input
        type="hidden"
        name="videoGenSkipped"
        value={props.videoGenSkipped ? "true" : "false"}
      />

      <input
        type="hidden"
        name="videoService"
        value={props.videoService}
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

      <input
        type="hidden"
        name="videoAspectRatio"
        value={props.videoAspectRatio}
      />

      <SkipCheckbox
        checked={props.videoGenSkipped}
        onChange={props.setVideoGenSkipped}
        disabled={props.disabled}
        label="Skip AI video generation"
        helpText="Check this box to skip generating AI videos. Video generation can take several minutes per video."
      />

      <Show when={!props.videoGenSkipped}>
        <div class={shared.formGroup}>
          <label class={shared.label}>Select Video Model</label>
          <ModelGrid>
            <For each={videoServices}>
              {([serviceId, serviceConfig]) => (
                <For each={serviceConfig.models}>
                  {(model) => (
                    <ModelButton
                      service={serviceConfig.name}
                      name={model.name}
                      description={model.description}
                      speed={model.speed}
                      quality={model.quality}
                      selected={isModelSelected(serviceId, model.id)}
                      disabled={props.disabled}
                      onClick={() => handleModelClick(serviceId, model.id)}
                    />
                  )}
                </For>
              )}
            </For>
          </ModelGrid>
        </div>

        <VideoOptions
          videoService={props.videoService}
          videoSize={props.videoSize}
          setVideoSize={props.setVideoSize}
          videoDuration={props.videoDuration}
          setVideoDuration={props.setVideoDuration}
          videoAspectRatio={props.videoAspectRatio}
          setVideoAspectRatio={props.setVideoAspectRatio}
          disabled={props.disabled}
          sizes={currentConfig()?.sizes || []}
          durations={currentConfig()?.durations || []}
          aspectRatios={currentConfig()?.aspectRatios}
        />

        <div class={shared.formGroup}>
          <label class={shared.label}>Select Video Type (1)</label>

          <OptionGrid>
            <For each={VIDEO_PROMPT_TYPES}>
              {(promptType) => {
                const config = VIDEO_PROMPT_CONFIG[promptType]
                const isSelected = () => props.selectedVideoPrompts.includes(promptType)

                return (
                  <OptionButton
                    title={config.title}
                    description={config.description}
                    selected={isSelected()}
                    disabled={props.disabled}
                    onClick={() => togglePrompt(promptType, { current: () => props.selectedVideoPrompts, setter: props.setSelectedVideoPrompts, maxItems: 1 })}
                    variant="simple"
                  />
                )
              }}
            </For>
          </OptionGrid>

          <p class={shared.promptHelpText}>
            Select 1 type of video to generate. {props.selectedVideoPrompts.length > 0 && `${props.selectedVideoPrompts.length} of 1 selected.`}
          </p>
        </div>
      </Show>
    </>
  )
}

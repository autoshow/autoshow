import clsx from "clsx"
import { For,createMemo } from "solid-js"
import { VIDEO_CONFIG } from "~/models"
import { VIDEO_PROMPT_CONFIG,VIDEO_PROMPT_TYPES } from "~/prompts/video-prompts"
import type {
SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate as CuratedModelCandidate,
SourceUtilsCostHelpersEstimatedDisplayCost as EstimatedDisplayCost,
SourceRoutesCreateStepsComponentsStep4WrapperVideoProps as Props,
VideoConfig,
SourceRoutesCreateStepsComponentsStep4WrapperVideoVideoEntry as VideoEntry,
VideoGenServiceType
} from '~/types'
import { estimateVideoDisplayCost,getResolvedPromptCount } from "~/utils/cost-helpers"
import {
CuratedModelPicker,
OptionButton,
OptionGrid,
togglePrompt,
} from "../shared"
import { buildCandidateKey } from "../shared/curated-models"
import shared from "../shared/shared.module.css"
import s from "./Video.module.css"
import VideoOptions from "./VideoOptions"

function getVideoEntries(config: VideoConfig): VideoEntry[] {
  return (Object.keys(config) as VideoGenServiceType[])
    .filter((key) => config[key] !== undefined)
    .map((key) => [key, config[key]!])
}

const videoServices = getVideoEntries(VIDEO_CONFIG)

export default function Video(props: Props) {
  const videoConfig = createMemo(() => VIDEO_CONFIG[props.videoService])
  const videoPromptCount = createMemo(() => getResolvedPromptCount(props.selectedVideoPrompts))

  const videoCandidates = createMemo(() => {
    return videoServices.flatMap(([serviceId, serviceConfig]) =>
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
          estimateVideoDisplayCost({
            videoService: serviceId,
            videoModel: model.id,
            videoDuration: props.videoDuration,
            promptCount: videoPromptCount(),
            llmEnabled: props.llmEnabled,
            llmService: props.llmService,
            llmModel: props.llmModel,
            sourceDurationSeconds: props.sourceDurationSeconds,
          })?.usd ?? Number.POSITIVE_INFINITY,
        displayCost:
          estimateVideoDisplayCost({
            videoService: serviceId,
            videoModel: model.id,
            videoDuration: props.videoDuration,
            promptCount: videoPromptCount(),
            llmEnabled: props.llmEnabled,
            llmService: props.llmService,
            llmModel: props.llmModel,
            sourceDurationSeconds: props.sourceDurationSeconds,
          }) ?? null,
      }))
    ) satisfies Array<CuratedModelCandidate & { displayCost: EstimatedDisplayCost | null }>
  })

  const getCostLabel = (
    candidate: CuratedModelCandidate & { displayCost: EstimatedDisplayCost | null }
  ): string | undefined => {
    return candidate.displayCost ? `${candidate.displayCost.centsLabel}¢` : undefined
  }

  const handleVideoModelClick = (serviceId: VideoGenServiceType, modelId: string) => {
    props.setVideoService(serviceId)
    props.setVideoModel(modelId)
  }

  return (
    <section class={s.mediaSection}>
      <div class={s.sectionHeader}>
        <h3 class={s.sectionTitle}>Video</h3>
        <p class={s.sectionDescription}>
          Configure the video generator, output format, prompt type, and optional scene direction.
        </p>
      </div>

      <fieldset class={clsx(shared.fieldset, s.videoFieldset)}>
        <legend class={shared.legend}>Select Video Model</legend>
        <CuratedModelPicker
          candidates={videoCandidates()}
          operation="video"
          selectedKey={buildCandidateKey(props.videoService, props.videoModel)}
          selectionActive={props.videoModelSelected}
          modelInputName="ui-video-model"
          disabled={props.disabled}
          onSelect={(candidate) =>
            handleVideoModelClick(candidate.serviceId as VideoGenServiceType, candidate.modelId)
          }
          getCostLabel={getCostLabel}
        />
      </fieldset>

      <VideoOptions
        videoService={props.videoService}
        videoSize={props.videoSize}
        setVideoSize={props.setVideoSize}
        videoSizeSelected={props.videoSizeSelected}
        videoDuration={props.videoDuration}
        setVideoDuration={props.setVideoDuration}
        videoDurationSelected={props.videoDurationSelected}
        videoAspectRatio={props.videoAspectRatio}
        setVideoAspectRatio={props.setVideoAspectRatio}
        videoAspectRatioSelected={props.videoAspectRatioSelected}
        disabled={props.disabled}
        sizes={videoConfig()?.sizes || []}
        durations={videoConfig()?.durations || []}
        aspectRatios={videoConfig()?.aspectRatios}
        fieldsetClass={s.videoFieldset}
      />

      <fieldset class={clsx(shared.fieldset, s.videoFieldset)}>
        <legend class={shared.legend}>Select Video Type (1)</legend>
        <OptionGrid class={s.videoTypeGrid}>
          <For each={VIDEO_PROMPT_TYPES}>
            {(promptType) => {
              const config = () => VIDEO_PROMPT_CONFIG[promptType]
              return (
                <OptionButton
                  title={config().title}
                  description={config().description}
                  selected={props.videoPromptSelected && props.selectedVideoPrompts.includes(promptType)}
                  name="ui-video-prompt"
                  value={promptType}
                  inputType="radio"
                  disabled={props.disabled}
                  onClick={() =>
                    togglePrompt(promptType, {
                      current: () => props.selectedVideoPrompts,
                      setter: props.setSelectedVideoPrompts,
                      maxItems: 1,
                    })
                  }
                  variant="simple"
                />
              )
            }}
          </For>
        </OptionGrid>
        <p class={clsx(shared.promptHelpText, s.videoPromptHelpText)}>
          Select 1 type of video to generate.{" "}
          {props.selectedVideoPrompts.length > 0 &&
            `${props.selectedVideoPrompts.length} of 1 selected.`}
        </p>
      </fieldset>

      <fieldset class={clsx(shared.fieldset, s.videoFieldset)}>
        <legend class={shared.legend}>Optional Custom Instructions</legend>
        <p class={clsx(shared.helpText, s.videoHelpText)}>
          Add extra scene direction or stylistic constraints to append before the video scene prompt
          is generated.
        </p>
        <textarea
          class={shared.textarea}
          value={props.videoCustomInstructions}
          onInput={(event) => props.setVideoCustomInstructions(event.currentTarget.value)}
          placeholder="Example: Use dynamic camera motion, modern product-shot framing, and avoid on-screen text."
          disabled={props.disabled}
        />
      </fieldset>
    </section>
  )
}

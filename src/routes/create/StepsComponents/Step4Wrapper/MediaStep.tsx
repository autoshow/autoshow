import { Match,Switch } from "solid-js"
import type { SourceRoutesCreateStepsComponentsStep4WrapperMediaStepProps as Props } from '~/types'
import {
OptionButton,
OptionGrid,
StepHeader,
} from "../shared"
import shared from "../shared/shared.module.css"
import Image from "./Image"
import s from "./MediaStep.module.css"
import Music from "./Music"
import Video from "./Video"

export default function MediaStep(props: Props) {
  const anyMediaEnabled = () => props.imageEnabled || props.videoEnabled || props.musicEnabled

  return (
    <>
      <StepHeader
        stepNumber={props.stepNumber}
        title="Image, Video, and Music"
        description="Choose which media outputs to generate, then configure each one."
      />

      <Switch>
        <Match when={props.currentSubStep === "decision"}>
          <fieldset class={shared.fieldset}>
            <legend class={shared.legend}>Enable Media Outputs</legend>
            <div class={s.toggleSection}>
              <OptionGrid>
                <OptionButton
                  title="Skip Media"
                  description="Do not generate image, video, or music outputs."
                  selected={props.mediaDecisionSelected && !anyMediaEnabled()}
                  name="ui-media-decision"
                  value="skip"
                  inputType="radio"
                  disabled={props.disabled}
                  onClick={() => {
                    props.setImageEnabled(false)
                    props.setVideoEnabled(false)
                    props.setMusicEnabled(false)
                  }}
                />
                <OptionButton
                  title="Image"
                  description="Generate one image output from the transcript or document text."
                  selected={props.mediaDecisionSelected && props.imageEnabled}
                  name="ui-media-toggle"
                  value="image"
                  inputType="checkbox"
                  disabled={props.disabled}
                  onClick={() => props.setImageEnabled(!props.imageEnabled)}
                />
                <OptionButton
                  title="Video"
                  description="Generate one video output with scene prompting."
                  selected={props.videoEnabled}
                  name="ui-media-toggle"
                  value="video"
                  inputType="checkbox"
                  disabled={props.disabled}
                  onClick={() => props.setVideoEnabled(!props.videoEnabled)}
                />
                <OptionButton
                  title="Music"
                  description="Generate one music output, with lyric writing only when needed."
                  selected={props.musicEnabled}
                  name="ui-media-toggle"
                  value="music"
                  inputType="checkbox"
                  disabled={props.disabled}
                  onClick={() => props.setMusicEnabled(!props.musicEnabled)}
                />
              </OptionGrid>
            </div>
          </fieldset>

        </Match>

        <Match when={props.currentSubStep === "image"}>
          <Image
            selectedImagePrompts={props.selectedImagePrompts}
            imagePromptSelected={props.imagePromptSelected}
            setSelectedImagePrompts={props.setSelectedImagePrompts}
            imageService={props.imageService}
            setImageService={props.setImageService}
            imageModel={props.imageModel}
            imageModelSelected={props.imageModelSelected}
            setImageModel={props.setImageModel}
            imageDimensionOrRatio={props.imageDimensionOrRatio}
            imageDimensionSelected={props.imageDimensionSelected}
            setImageDimensionOrRatio={props.setImageDimensionOrRatio}
            imageCustomInstructions={props.imageCustomInstructions}
            setImageCustomInstructions={props.setImageCustomInstructions}
            disabled={props.disabled}
          />
        </Match>

        <Match when={props.currentSubStep === "video"}>
          <Video
            videoService={props.videoService}
            setVideoService={props.setVideoService}
            selectedVideoPrompts={props.selectedVideoPrompts}
            videoPromptSelected={props.videoPromptSelected}
            setSelectedVideoPrompts={props.setSelectedVideoPrompts}
            videoModel={props.videoModel}
            videoModelSelected={props.videoModelSelected}
            setVideoModel={props.setVideoModel}
            videoSize={props.videoSize}
            videoSizeSelected={props.videoSizeSelected}
            setVideoSize={props.setVideoSize}
            videoDuration={props.videoDuration}
            videoDurationSelected={props.videoDurationSelected}
            setVideoDuration={props.setVideoDuration}
            videoAspectRatio={props.videoAspectRatio}
            videoAspectRatioSelected={props.videoAspectRatioSelected}
            setVideoAspectRatio={props.setVideoAspectRatio}
            videoCustomInstructions={props.videoCustomInstructions}
            setVideoCustomInstructions={props.setVideoCustomInstructions}
            disabled={props.disabled}
            llmEnabled={props.llmEnabled}
            llmService={props.llmService}
            llmModel={props.llmModel}
            sourceDurationSeconds={props.sourceDurationSeconds}
          />
        </Match>

        <Match when={props.currentSubStep === "music"}>
          <Music
            musicService={props.musicService}
            setMusicService={props.setMusicService}
            musicModel={props.musicModel}
            musicModelSelected={props.musicModelSelected}
            setMusicModel={props.setMusicModel}
            selectedMusicGenre={props.selectedMusicGenre}
            musicGenreSelected={props.musicGenreSelected}
            setSelectedMusicGenre={props.setSelectedMusicGenre}
            musicPreset={props.musicPreset}
            musicPresetSelected={props.musicPresetSelected}
            setMusicPreset={props.setMusicPreset}
            musicDurationSeconds={props.musicDurationSeconds}
            musicDurationSelected={props.musicDurationSelected}
            setMusicDurationSeconds={props.setMusicDurationSeconds}
            musicInstrumental={props.musicInstrumental}
            setMusicInstrumental={props.setMusicInstrumental}
            musicSampleRate={props.musicSampleRate}
            setMusicSampleRate={props.setMusicSampleRate}
            musicBitrate={props.musicBitrate}
            setMusicBitrate={props.setMusicBitrate}
            musicCustomInstructions={props.musicCustomInstructions}
            setMusicCustomInstructions={props.setMusicCustomInstructions}
            disabled={props.disabled}
            llmEnabled={props.llmEnabled}
            llmService={props.llmService}
            llmModel={props.llmModel}
            sourceDurationSeconds={props.sourceDurationSeconds}
          />
        </Match>
      </Switch>
    </>
  )
}

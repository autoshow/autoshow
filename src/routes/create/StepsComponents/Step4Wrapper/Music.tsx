import clsx from "clsx"
import { For,Show,createMemo } from "solid-js"
import {
MUSIC_CONFIG,
getDefaultMusicService,
} from "~/models"
import type {
SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate as CuratedModelCandidate,
SourceUtilsCostHelpersEstimatedDisplayCost as EstimatedDisplayCost,
MusicBitrate,
MusicConfig,
SourceRoutesCreateStepsComponentsStep4WrapperMusicMusicEntry as MusicEntry,
MusicPreset,
MusicSampleRate,
MusicServiceType,
SourceRoutesCreateStepsComponentsStep4WrapperMusicProps as Props
} from '~/types'
import { estimateMusicDisplayCost } from "~/utils/cost-helpers"
import {
ChoiceChip,
CuratedModelPicker,
OptionButton,
OptionGrid,
} from "../shared"
import { buildCandidateKey } from "../shared/curated-models"
import shared from "../shared/shared.module.css"
import s from "./Music.module.css"

const MUSIC_PRESETS: Array<{ id: MusicPreset; title: string; description: string }> = [
  { id: "cheap", title: "Cheap", description: "Lower cost defaults tuned for quick drafts." },
  { id: "balanced", title: "Balanced", description: "Middle-ground quality and price." },
  { id: "quality", title: "Quality", description: "Higher quality defaults with higher cost." },
]

const DURATION_OPTIONS = [30, 60, 90, 120, 180]
const SAMPLE_RATE_OPTIONS: MusicSampleRate[] = [16000, 24000, 32000, 44100]
const BITRATE_OPTIONS: MusicBitrate[] = [32000, 64000, 128000, 256000]

function getMusicEntries(config: MusicConfig): MusicEntry[] {
  return (Object.keys(config) as MusicServiceType[]).map((key) => [key, config[key]])
}

const musicServices = getMusicEntries(MUSIC_CONFIG)

export default function Music(props: Props) {
  const musicConfig = createMemo(() => {
    const fallbackService = getDefaultMusicService()
    return MUSIC_CONFIG[props.musicService] || MUSIC_CONFIG[fallbackService]
  })
  const isMinimaxMusic = createMemo(() => props.musicService === "minimax")

  const musicCandidates = createMemo(() => {
    return musicServices.flatMap(([serviceId, serviceConfig]) =>
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
          estimateMusicDisplayCost({
            musicService: serviceId,
            musicModel: model.id,
            musicDurationSeconds: props.musicDurationSeconds,
            musicInstrumental: props.musicInstrumental,
            llmEnabled: props.llmEnabled,
            llmService: props.llmService,
            llmModel: props.llmModel,
            sourceDurationSeconds: props.sourceDurationSeconds,
          })?.usd ?? Number.POSITIVE_INFINITY,
        displayCost:
          estimateMusicDisplayCost({
            musicService: serviceId,
            musicModel: model.id,
            musicDurationSeconds: props.musicDurationSeconds,
            musicInstrumental: props.musicInstrumental,
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

  const handleMusicModelSelection = (service: MusicServiceType, modelId: string) => {
    props.setMusicService(service)
    props.setMusicModel(modelId)
    if (service !== "minimax") {
      props.setMusicSampleRate(undefined)
      props.setMusicBitrate(undefined)
    }
  }

  const setDurationFromInput = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isInteger(parsed)) {
      props.setMusicDurationSeconds(3)
      return
    }
    props.setMusicDurationSeconds(Math.max(3, Math.min(300, parsed)))
  }

  return (
    <section class={s.mediaSection}>
      <div class={s.sectionHeader}>
        <h3 class={s.sectionTitle}>Music</h3>
        <p class={s.sectionDescription}>
          Configure the music generator, cost preset, duration, genre, and lyric direction.
        </p>
      </div>

      <fieldset class={clsx(shared.fieldset, s.musicFieldset)}>
        <legend class={shared.legend}>Select Music Model</legend>
        <CuratedModelPicker
          candidates={musicCandidates()}
          operation="music"
          selectedKey={buildCandidateKey(props.musicService, props.musicModel)}
          selectionActive={props.musicModelSelected}
          modelInputName="ui-music-model"
          disabled={props.disabled}
          onSelect={(candidate) =>
            handleMusicModelSelection(
              candidate.serviceId as MusicServiceType,
              candidate.modelId
            )
          }
          getCostLabel={getCostLabel}
        />
      </fieldset>

      <fieldset class={clsx(shared.fieldset, s.musicFieldset)}>
        <legend class={shared.legend}>Cost and Quality Preset</legend>
        <OptionGrid class={s.musicPresetGrid}>
          <For each={MUSIC_PRESETS}>
            {(preset) => (
              <OptionButton
                title={preset.title}
                description={preset.description}
                selected={props.musicPresetSelected && props.musicPreset === preset.id}
                name="ui-music-preset"
                value={preset.id}
                inputType="radio"
                disabled={props.disabled}
                onClick={() => props.setMusicPreset(preset.id)}
                variant="simple"
              />
            )}
          </For>
        </OptionGrid>
      </fieldset>

      <fieldset class={clsx(shared.fieldset, s.musicFieldset)}>
        <legend class={shared.legend}>Target Duration (seconds)</legend>
        <div class={shared.choiceSet}>
          <For each={DURATION_OPTIONS}>
            {(duration) => (
              <ChoiceChip
                name="ui-music-duration"
                value={duration.toString()}
                checked={props.musicDurationSelected && props.musicDurationSeconds === duration}
                onChange={() => props.setMusicDurationSeconds(duration)}
                disabled={props.disabled}
              >
                {duration}s
              </ChoiceChip>
            )}
          </For>
        </div>
        <input
          type="number"
          min="3"
          max="300"
          value={props.musicDurationSeconds}
          disabled={props.disabled}
          onInput={(event) => setDurationFromInput(event.currentTarget.value)}
          class={shared.choiceInput}
        />
      </fieldset>

      <div class={clsx(shared.formGroup, s.instrumentalGroup)}>
        <label class={clsx(shared.label, s.instrumentalLabel)}>
          <input
            type="checkbox"
            checked={props.musicInstrumental}
            disabled={props.disabled}
            onChange={(event) => props.setMusicInstrumental(event.currentTarget.checked)}
          />{" "}
          Instrumental only (skip lyric generation)
        </label>
      </div>

      <Show when={isMinimaxMusic()}>
        <details class={clsx(shared.formGroup, s.advancedGroup)}>
          <summary class={shared.legend}>Advanced MiniMax Audio Settings</summary>

          <fieldset class={clsx(shared.fieldset, s.musicFieldset)}>
            <legend class={shared.legend}>Sample Rate</legend>
            <div class={shared.choiceSet}>
              <ChoiceChip
                name="ui-music-sample-rate"
                value="auto"
                checked={!props.musicSampleRate}
                onChange={() => props.setMusicSampleRate(undefined)}
                disabled={props.disabled}
              >
                Auto
              </ChoiceChip>
              <For each={SAMPLE_RATE_OPTIONS}>
                {(sampleRate) => (
                  <ChoiceChip
                    name="ui-music-sample-rate"
                    value={sampleRate.toString()}
                    checked={props.musicSampleRate === sampleRate}
                    onChange={() => props.setMusicSampleRate(sampleRate)}
                    disabled={props.disabled}
                  >
                    {sampleRate}
                  </ChoiceChip>
                )}
              </For>
            </div>
          </fieldset>

          <fieldset class={clsx(shared.fieldset, s.musicFieldset)}>
            <legend class={shared.legend}>Bitrate</legend>
            <div class={shared.choiceSet}>
              <ChoiceChip
                name="ui-music-bitrate"
                value="auto"
                checked={!props.musicBitrate}
                onChange={() => props.setMusicBitrate(undefined)}
                disabled={props.disabled}
              >
                Auto
              </ChoiceChip>
              <For each={BITRATE_OPTIONS}>
                {(bitrate) => (
                  <ChoiceChip
                    name="ui-music-bitrate"
                    value={bitrate.toString()}
                    checked={props.musicBitrate === bitrate}
                    onChange={() => props.setMusicBitrate(bitrate)}
                    disabled={props.disabled}
                  >
                    {bitrate}
                  </ChoiceChip>
                )}
              </For>
            </div>
          </fieldset>
        </details>
      </Show>

      <fieldset class={clsx(shared.fieldset, s.musicFieldset)}>
        <legend class={shared.legend}>Select Music Genre</legend>
        <OptionGrid class={s.musicGenreGrid}>
          <For each={musicConfig().genres}>
            {(genre) => (
              <OptionButton
                title={genre.name}
                description={genre.description}
                selected={props.musicGenreSelected && props.selectedMusicGenre === genre.id}
                name="ui-music-genre"
                value={genre.id}
                inputType="radio"
                disabled={props.disabled}
                onClick={() => props.setSelectedMusicGenre(genre.id)}
                variant="simple"
              />
            )}
          </For>
        </OptionGrid>
        <p class={clsx(shared.promptHelpText, s.musicPromptHelpText)}>
          Select the musical style for your AI-generated track.
        </p>
      </fieldset>

      <fieldset class={clsx(shared.fieldset, s.musicFieldset)}>
        <legend class={shared.legend}>Optional Custom Instructions</legend>
        <p class={clsx(shared.helpText, s.musicHelpText)}>
          Add extra direction for lyric writing or mood. These instructions are ignored when
          instrumental mode is enabled.
        </p>
        <textarea
          class={shared.textarea}
          value={props.musicCustomInstructions}
          onInput={(event) => props.setMusicCustomInstructions(event.currentTarget.value)}
          placeholder="Example: Write concise uplifting lyrics with a memorable hook and no spoken-word intro."
          disabled={props.disabled}
        />
      </fieldset>
    </section>
  )
}

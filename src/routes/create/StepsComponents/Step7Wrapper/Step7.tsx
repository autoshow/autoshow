import { Show, For, createMemo } from "solid-js"
import type { MusicServiceType, MusicConfig, MusicPreset, MusicSampleRate, MusicBitrate } from "~/types"
import { MUSIC_CONFIG, getDefaultMusicService } from "~/models"
import shared from "../shared/shared.module.css"
import { StepHeader, SkipCheckbox, OptionButton, OptionGrid, ModelButton, ModelGrid } from "../shared"

type Props = {
  musicGenSkipped: boolean
  setMusicGenSkipped: (value: boolean) => void
  musicService: MusicServiceType
  setMusicService: (service: MusicServiceType) => void
  musicModel: string
  setMusicModel: (model: string) => void
  selectedMusicGenre: string
  setSelectedMusicGenre: (genre: string) => void
  musicPreset: MusicPreset
  setMusicPreset: (preset: MusicPreset) => void
  musicDurationSeconds: number
  setMusicDurationSeconds: (seconds: number) => void
  musicInstrumental: boolean
  setMusicInstrumental: (value: boolean) => void
  musicSampleRate: MusicSampleRate | undefined
  setMusicSampleRate: (value: MusicSampleRate | undefined) => void
  musicBitrate: MusicBitrate | undefined
  setMusicBitrate: (value: MusicBitrate | undefined) => void
  disabled: boolean | undefined
}

type MusicEntry = [MusicServiceType, MusicConfig[MusicServiceType]]

const MUSIC_PRESETS: Array<{ id: MusicPreset, title: string, description: string }> = [
  { id: "cheap", title: "Cheap", description: "Lower cost defaults tuned for quick drafts." },
  { id: "balanced", title: "Balanced", description: "Middle-ground quality and price." },
  { id: "quality", title: "Quality", description: "Higher quality defaults with higher cost." }
]

const DURATION_OPTIONS = [30, 60, 90, 120, 180]
const SAMPLE_RATE_OPTIONS: MusicSampleRate[] = [16000, 24000, 32000, 44100]
const BITRATE_OPTIONS: MusicBitrate[] = [32000, 64000, 128000, 256000]

function getMusicEntries(config: MusicConfig): MusicEntry[] {
  return (Object.keys(config) as MusicServiceType[]).map(key => [key, config[key]])
}

export default function Step7(props: Props) {
  const currentServiceConfig = createMemo(() => {
    const fallbackService = getDefaultMusicService()
    return MUSIC_CONFIG[props.musicService] || MUSIC_CONFIG[fallbackService]
  })

  const musicServices = getMusicEntries(MUSIC_CONFIG)
  const isMinimax = createMemo(() => props.musicService === "minimax")

  const handleServiceChange = (service: MusicServiceType) => {
    props.setMusicService(service)
    const config = MUSIC_CONFIG[service]
    props.setMusicModel(config.model)
    if (config && config.genres.length > 0) {
      const firstGenre = config.genres[0]
      if (firstGenre) {
        props.setSelectedMusicGenre(firstGenre.id)
      }
    }
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
    <>
      <StepHeader
        stepNumber={7}
        title="Music Generation (Optional)"
        description="Optionally generate an original music track with configurable duration and quality."
      />

      <input
        type="hidden"
        name="musicGenSkipped"
        value={props.musicGenSkipped ? "true" : "false"}
      />

      <input
        type="hidden"
        name="musicService"
        value={props.musicService}
      />

      <input
        type="hidden"
        name="musicModel"
        value={props.musicModel}
      />

      <input
        type="hidden"
        name="selectedMusicGenre"
        value={props.selectedMusicGenre}
      />

      <input
        type="hidden"
        name="musicPreset"
        value={props.musicPreset}
      />

      <input
        type="hidden"
        name="musicDurationSeconds"
        value={String(props.musicDurationSeconds)}
      />

      <input
        type="hidden"
        name="musicInstrumental"
        value={props.musicInstrumental ? "true" : "false"}
      />

      <input
        type="hidden"
        name="musicSampleRate"
        value={props.musicSampleRate ? String(props.musicSampleRate) : ""}
      />

      <input
        type="hidden"
        name="musicBitrate"
        value={props.musicBitrate ? String(props.musicBitrate) : ""}
      />

      <SkipCheckbox
        checked={props.musicGenSkipped}
        onChange={props.setMusicGenSkipped}
        disabled={props.disabled}
        label="Skip music generation"
        helpText="Check this box to skip generating an AI-composed music track based on your content."
      />

      <Show when={!props.musicGenSkipped}>
        <div class={shared.formGroup}>
          <label class={shared.label}>Select Music Service</label>
          <ModelGrid>
            <For each={musicServices}>
              {([serviceId, serviceConfig]) => (
                <ModelButton
                  service={serviceConfig.name}
                  name={serviceConfig.model}
                  description={serviceConfig.description}
                  selected={props.musicService === serviceId}
                  disabled={props.disabled}
                  onClick={() => handleServiceChange(serviceId)}
                />
              )}
            </For>
          </ModelGrid>
        </div>

        <div class={shared.formGroup}>
          <label class={shared.label}>Select Music Genre</label>

          <OptionGrid>
            <For each={currentServiceConfig().genres}>
              {(genre) => {
                const isSelected = () => props.selectedMusicGenre === genre.id

                return (
                  <OptionButton
                    title={genre.name}
                    description={genre.description}
                    selected={isSelected()}
                    disabled={props.disabled}
                    onClick={() => props.setSelectedMusicGenre(genre.id)}
                    variant="simple"
                  />
                )
              }}
            </For>
          </OptionGrid>

          <p class={shared.promptHelpText}>Select the musical style for your AI-generated track.</p>
        </div>

        <div class={shared.formGroup}>
          <label class={shared.label}>Cost and Quality Preset</label>
          <OptionGrid>
            <For each={MUSIC_PRESETS}>
              {(preset) => (
                <OptionButton
                  title={preset.title}
                  description={preset.description}
                  selected={props.musicPreset === preset.id}
                  disabled={props.disabled}
                  onClick={() => props.setMusicPreset(preset.id)}
                  variant="simple"
                />
              )}
            </For>
          </OptionGrid>
        </div>

        <div class={shared.formGroup}>
          <label class={shared.label}>Target Duration (seconds)</label>
          <div class={shared.aspectRatioGrid}>
            <For each={DURATION_OPTIONS}>
              {(duration) => {
                const isSelected = () => props.musicDurationSeconds === duration
                return (
                  <button
                    type="button"
                    class={isSelected() ? shared.aspectRatioButtonSelected : shared.aspectRatioButton}
                    onClick={() => props.setMusicDurationSeconds(duration)}
                    disabled={props.disabled}
                  >
                    {duration}s
                  </button>
                )
              }}
            </For>
          </div>
          <input
            type="number"
            min="3"
            max="300"
            value={props.musicDurationSeconds}
            disabled={props.disabled}
            onInput={(event) => setDurationFromInput(event.currentTarget.value)}
            class={shared.aspectRatioButton}
          />
        </div>

        <div class={shared.formGroup}>
          <label class={shared.label}>
            <input
              type="checkbox"
              checked={props.musicInstrumental}
              disabled={props.disabled}
              onChange={(event) => props.setMusicInstrumental(event.currentTarget.checked)}
            />
            {' '}Instrumental only (skip lyric generation)
          </label>
        </div>

        <Show when={isMinimax()}>
          <details class={shared.formGroup}>
            <summary class={shared.label}>Advanced MiniMax Audio Settings</summary>

            <label class={shared.label}>Sample Rate</label>
            <div class={shared.aspectRatioGrid}>
              <button
                type="button"
                class={!props.musicSampleRate ? shared.aspectRatioButtonSelected : shared.aspectRatioButton}
                onClick={() => props.setMusicSampleRate(undefined)}
                disabled={props.disabled}
              >
                Auto
              </button>
              <For each={SAMPLE_RATE_OPTIONS}>
                {(sampleRate) => {
                  const isSelected = () => props.musicSampleRate === sampleRate
                  return (
                    <button
                      type="button"
                      class={isSelected() ? shared.aspectRatioButtonSelected : shared.aspectRatioButton}
                      onClick={() => props.setMusicSampleRate(sampleRate)}
                      disabled={props.disabled}
                    >
                      {sampleRate}
                    </button>
                  )
                }}
              </For>
            </div>

            <label class={shared.label}>Bitrate</label>
            <div class={shared.aspectRatioGrid}>
              <button
                type="button"
                class={!props.musicBitrate ? shared.aspectRatioButtonSelected : shared.aspectRatioButton}
                onClick={() => props.setMusicBitrate(undefined)}
                disabled={props.disabled}
              >
                Auto
              </button>
              <For each={BITRATE_OPTIONS}>
                {(bitrate) => {
                  const isSelected = () => props.musicBitrate === bitrate
                  return (
                    <button
                      type="button"
                      class={isSelected() ? shared.aspectRatioButtonSelected : shared.aspectRatioButton}
                      onClick={() => props.setMusicBitrate(bitrate)}
                      disabled={props.disabled}
                    >
                      {bitrate}
                    </button>
                  )
                }}
              </For>
            </div>
          </details>
        </Show>
      </Show>
    </>
  )
}

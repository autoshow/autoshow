import { describe, expect, test } from "bun:test"
import { buildProcessingOptions } from "~/routes/api/process/form-helpers/build-options"
import { getMinimaxAudioSettings, getMinimaxLyricsInput } from "~/routes/api/process/07-run-music/music-services/run-minimax-music"
import { getElevenLabsMusicLengthMs } from "~/routes/api/process/07-run-music/music-services/run-elevenlabs-music"
import type { ProcessingFormData } from "~/types"

const buildBaseForm = (): ProcessingFormData => ({
  transcriptionOption: "groq",
  transcriptionModel: "whisper-large-v3-turbo",
  llmService: "groq",
  llmModel: "openai/gpt-oss-20b",
  selectedPrompts: "shortSummary",
  uploadedFilePath: "/tmp/input.mp3",
  uploadedFileName: "input.mp3",
  musicGenSkipped: "false",
  musicService: "minimax",
  musicModel: "music-2.5",
  selectedMusicGenre: "pop",
  musicPreset: "cheap",
  musicDurationSeconds: "60",
  musicInstrumental: "false",
  videoGenEnabled: "false",
  ttsEnabled: "false",
  imageGenEnabled: "false"
})

describe("music processing option validation", () => {
  test("requires music preset when music generation is enabled", () => {
    const form = buildBaseForm()
    form.musicPreset = undefined

    expect(() => buildProcessingOptions(form)).toThrow("Music preset is required")
  })

  test("requires duration to be between 3 and 300", () => {
    const form = buildBaseForm()
    form.musicDurationSeconds = "301"

    expect(() => buildProcessingOptions(form)).toThrow("Music duration seconds must be an integer between 3 and 300")
  })

  test("parses and includes advanced music options", () => {
    const form = buildBaseForm()
    form.musicPreset = "balanced"
    form.musicDurationSeconds = "90"
    form.musicInstrumental = "true"
    form.musicSampleRate = "32000"
    form.musicBitrate = "128000"

    const options = buildProcessingOptions(form)
    expect(options.musicPreset).toBe("balanced")
    expect(options.musicDurationSeconds).toBe(90)
    expect(options.musicInstrumental).toBe(true)
    expect(options.musicSampleRate).toBe(32000)
    expect(options.musicBitrate).toBe(128000)
  })
})

describe("music service settings", () => {
  test("maps elevenlabs duration seconds to milliseconds", () => {
    expect(getElevenLabsMusicLengthMs(30)).toBe(30000)
  })

  test("maps minimax preset to balanced defaults", () => {
    const settings = getMinimaxAudioSettings({
      musicPreset: "balanced",
      musicDurationSeconds: 60,
      musicInstrumental: false,
      musicSampleRate: undefined,
      musicBitrate: undefined
    })

    expect(settings.sampleRate).toBe(32000)
    expect(settings.bitrate).toBe(128000)
  })

  test("uses minimax advanced overrides over preset", () => {
    const settings = getMinimaxAudioSettings({
      musicPreset: "cheap",
      musicDurationSeconds: 60,
      musicInstrumental: false,
      musicSampleRate: 44100,
      musicBitrate: 256000
    })

    expect(settings.sampleRate).toBe(44100)
    expect(settings.bitrate).toBe(256000)
  })

  test("uses instrumental placeholder lyrics for minimax", () => {
    const lyrics = getMinimaxLyricsInput("line one\nline two", true)
    expect(lyrics).toContain("[Inst]")
  })
})

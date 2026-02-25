import { For } from "solid-js"
import type { ShowNote, PromptType, DocumentExtractionServiceType, StepConfig } from "~/types"
import { TRANSCRIPTION_CONFIG, DOCUMENT_CONFIG, LLM_CONFIG, TTS_CONFIG, IMAGE_CONFIG, MUSIC_CONFIG, VIDEO_CONFIG } from "~/models"
import { PROMPT_CONFIG, PROMPT_TYPES } from "~/prompts/text-prompts/text-prompt-config"
import s from "./ShowNoteProcessingDetails.module.css"
import { MetadataCard } from "./MetadataCard"

function isPromptType(value: string): value is PromptType {
  return PROMPT_TYPES.includes(value as PromptType)
}

function isDocumentServiceType(value: string): value is DocumentExtractionServiceType {
  return value in DOCUMENT_CONFIG
}

type Props = {
  note: ShowNote
  formatFileSize: (bytes: number | null | undefined) => string
  formatProcessingTime: (ms: number | null | undefined) => string
  formatDuration: (seconds: number | null | undefined) => string
  formatMusicGenre: (genre: string | null | undefined) => string
}

function getTranscriptionServiceName(service: string | null | undefined): string {
  if (service === "groq") return TRANSCRIPTION_CONFIG.whisper.groq.name
  if (service === "deepinfra") return TRANSCRIPTION_CONFIG.whisper.deepinfra.name
  if (service === "happyscribe") return TRANSCRIPTION_CONFIG.streaming.happyscribe.name
  if (service === "fal") return TRANSCRIPTION_CONFIG.diarization.fal.name
  if (service === "gladia") return TRANSCRIPTION_CONFIG.diarization.gladia.name
  return service || "N/A"
}

function getDocumentServiceName(service: string | null | undefined): string {
  if (!service) return "N/A"
  if (!isDocumentServiceType(service)) return service
  const config = DOCUMENT_CONFIG[service]
  return config?.name || service
}

function getMusicServiceName(service: string | null | undefined): string {
  if (!service) return "N/A"
  return MUSIC_CONFIG[service as keyof typeof MUSIC_CONFIG]?.name || service
}

function getLlmServiceName(service: string | null | undefined): string {
  if (service === "openai") return LLM_CONFIG.openai.name
  if (service === "claude") return LLM_CONFIG.claude.name
  if (service === "gemini") return LLM_CONFIG.gemini.name
  return service || "N/A"
}

function formatSelectedPrompts(prompts: string | null | undefined): string {
  if (!prompts) return "All content types"
  const promptList = prompts.split(',').filter(p => p.trim().length > 0)
  if (promptList.length === 0) return "All content types"
  return promptList
    .map(p => {
      const key = p.trim()
      if (!isPromptType(key)) return key
      return PROMPT_CONFIG[key]?.title || key
    })
    .join(', ')
}

function getTtsServiceName(service: string | null | undefined): string {
  if (service === "openai") return TTS_CONFIG.openai.name
  if (service === "elevenlabs") return TTS_CONFIG.elevenlabs.name
  return service || "Unknown"
}

export default function ShowNoteProcessingDetails(props: Props) {
  const steps = (): StepConfig[] => [
    {
      title: "Step 1 - Download Audio",
      items: [
        { label: "Filename", value: props.note.audio_file_name || "N/A" },
        { label: "Size", value: props.formatFileSize(props.note.audio_file_size) },
        { label: "Published", value: props.note.video_publish_date || "", when: !!props.note.video_publish_date },
      ],
    },
    {
      title: "Step 2 - Run Transcription",
      items: [
        { label: "Service", value: getTranscriptionServiceName(props.note.transcription_service) },
        { label: "Model", value: props.note.transcription_model || "N/A" },
        { label: "Processing Time", value: props.formatProcessingTime(props.note.transcription_processing_time) },
        { label: "Token Count", value: props.note.transcription_token_count?.toLocaleString() || "N/A" },
      ],
    },
    {
      title: "Step 2 - Document Extraction",
      items: [
        { label: "Service", value: getDocumentServiceName(props.note.document_service) },
        { label: "Model", value: props.note.document_model || "N/A" },
        { label: "Processing Time", value: props.formatProcessingTime(props.note.transcription_processing_time) },
        { label: "Character Count", value: props.note.transcription_token_count?.toLocaleString() || "N/A" },
      ],
      when: !!props.note.document_service,
    },
    {
      title: "Step 3 - Content Selection",
      items: [
        { label: "Selected Content", value: formatSelectedPrompts(props.note.selected_prompts) },
      ],
    },
    {
      title: "Step 4 - LLM Text Generation",
      items: [
        { label: "Service", value: getLlmServiceName(props.note.llm_service) },
        { label: "Model", value: props.note.llm_model || "N/A" },
        { label: "Processing Time", value: props.formatProcessingTime(props.note.llm_processing_time) },
        { label: "Input Tokens", value: props.note.llm_input_token_count?.toLocaleString() || "N/A" },
        { label: "Output Tokens", value: props.note.llm_output_token_count?.toLocaleString() || "N/A" },
      ],
    },
    {
      title: "Step 5 - Text-to-Speech",
      enabled: props.note.tts_enabled,
      items: [
        { label: "Service", value: getTtsServiceName(props.note.tts_service) },
        { label: "Model", value: props.note.tts_model || "N/A" },
        { label: "Voice", value: props.note.tts_voice || "N/A" },
        { label: "Processing Time", value: props.formatProcessingTime(props.note.tts_processing_time) },
        { label: "Audio Duration", value: props.formatDuration(props.note.tts_audio_duration) },
        { label: "Audio File", value: props.note.tts_audio_file || "N/A" },
      ],
    },
    {
      title: "Step 6 - Image Generation",
      enabled: props.note.image_gen_enabled,
      items: [
        { label: "Service", value: IMAGE_CONFIG.openai.name },
        { label: "Model", value: props.note.image_gen_model || "N/A" },
        { label: "Images Generated", value: String(props.note.images_generated || "0") },
        { label: "Processing Time", value: props.formatProcessingTime(props.note.image_gen_processing_time) },
      ],
    },
    {
      title: "Step 7 - Music Generation",
      enabled: props.note.music_gen_enabled,
      items: [
        { label: "Service", value: getMusicServiceName(props.note.music_gen_service) },
        { label: "Model", value: props.note.music_gen_model || "N/A" },
        { label: "Genre", value: props.formatMusicGenre(props.note.music_gen_genre) },
        { label: "Preset", value: props.note.music_gen_preset || "N/A" },
        { label: "Target Duration", value: props.note.music_gen_target_duration ? `${props.note.music_gen_target_duration}s` : "N/A" },
        { label: "Instrumental", value: props.note.music_gen_instrumental === null ? "N/A" : (props.note.music_gen_instrumental ? "Yes" : "No") },
        { label: "Sample Rate", value: props.note.music_gen_sample_rate ? `${props.note.music_gen_sample_rate}` : "Auto" },
        { label: "Bitrate", value: props.note.music_gen_bitrate ? `${props.note.music_gen_bitrate}` : "Auto" },
        { label: "Processing Time", value: props.formatProcessingTime(props.note.music_gen_processing_time) },
        { label: "Music Duration", value: props.formatDuration(props.note.music_gen_duration) },
        { label: "Lyrics Length", value: `${props.note.music_gen_lyrics_length || "0"} characters` },
        { label: "Lyrics Gen Time", value: props.formatProcessingTime(props.note.music_gen_lyrics_generation_time) },
      ],
    },
    {
      title: "Step 8 - Video Generation",
      enabled: props.note.video_gen_enabled,
      items: [
        { label: "Service", value: VIDEO_CONFIG.openai.name },
        { label: "Model", value: props.note.video_gen_model || "N/A" },
        { label: "Videos Generated", value: String(props.note.videos_generated || "0") },
        { label: "Video Size", value: props.note.video_size || "N/A" },
        { label: "Video Duration", value: props.note.video_duration ? `${props.note.video_duration}s` : "N/A" },
        { label: "Processing Time", value: props.formatProcessingTime(props.note.video_gen_processing_time) },
      ],
    },
  ]

  return (
    <section class={s.section}>
      <h2 class={s.sectionTitle}>Processing Details</h2>
      <details>
        <summary class={s.detailsSummary}>Click to expand processing details</summary>
        <div class={s.metadataGrid}>
          <For each={steps()}>
            {(step) => <MetadataCard title={step.title} enabled={step.enabled} items={step.items} />}
          </For>
        </div>
      </details>
    </section>
  )
}

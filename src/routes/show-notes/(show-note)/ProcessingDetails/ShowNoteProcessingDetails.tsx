import { Show } from "solid-js"
import s from "./ShowNoteProcessingDetails.module.css"
import { SERVICES_CONFIG } from "~/utils/services"
import type { ShowNote } from "~/types/main"

type Props = {
  note: ShowNote
  formatFileSize: (bytes: number | null | undefined) => string
  formatProcessingTime: (ms: number | null | undefined) => string
  formatDuration: (seconds: number | null | undefined) => string
  formatSelectedPrompts: (prompts: string | null | undefined) => string
  formatMusicGenre: (genre: string | null | undefined) => string
}

export default function ShowNoteProcessingDetails(props: Props) {
  return (
    <section class={s.section}>
      <h2 class={s.sectionTitle}>
        Processing Details
      </h2>
      <details>
        <summary class={s.detailsSummary}>
          Click to expand processing details
        </summary>
        <div class={s.metadataGrid}>
        <div class={s.metadataCard}>
          <h3 class={s.metadataCardTitle}>Step 1 - Download Audio</h3>
          <div class={s.metadataItem}>
            <span class={s.metadataLabel}>Filename</span>
            <span class={s.metadataValue}>{props.note.audio_file_name || "N/A"}</span>
          </div>
          <div class={s.metadataItem}>
            <span class={s.metadataLabel}>Size</span>
            <span class={s.metadataValue}>{props.formatFileSize(props.note.audio_file_size)}</span>
          </div>
          <Show when={props.note.video_publish_date}>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Published</span>
              <span class={s.metadataValue}>{props.note.video_publish_date}</span>
            </div>
          </Show>
        </div>

        <div class={s.metadataCard}>
          <h3 class={s.metadataCardTitle}>Step 2 - Run Transcription</h3>
          <div class={s.metadataItem}>
            <span class={s.metadataLabel}>Service</span>
            <span class={s.metadataValue}>
              {props.note.transcription_service === 'groq' 
                ? SERVICES_CONFIG.transcription.whisper.groq.name
                : props.note.transcription_service === 'deepinfra'
                ? SERVICES_CONFIG.transcription.whisper.deepinfra.name
                : props.note.transcription_service === 'happyscribe'
                ? SERVICES_CONFIG.transcription.streaming.happyscribe.name
                : props.note.transcription_service}
            </span>
          </div>
          <div class={s.metadataItem}>
            <span class={s.metadataLabel}>Model</span>
            <span class={s.metadataValue}>
              {props.note.transcription_model || "N/A"}
            </span>
          </div>
          <div class={s.metadataItem}>
            <span class={s.metadataLabel}>Processing Time</span>
            <span class={s.metadataValue}>{props.formatProcessingTime(props.note.transcription_processing_time)}</span>
          </div>
          <div class={s.metadataItem}>
            <span class={s.metadataLabel}>Token Count</span>
            <span class={s.metadataValue}>{props.note.transcription_token_count?.toLocaleString() || "N/A"}</span>
          </div>
        </div>

        <div class={s.metadataCard}>
          <h3 class={s.metadataCardTitle}>Step 3 - Content Selection</h3>
          <div class={s.metadataItem}>
            <span class={s.metadataLabel}>Selected Content</span>
            <span class={s.metadataValue}>{props.formatSelectedPrompts(props.note.selected_prompts)}</span>
          </div>
        </div>

        <div class={s.metadataCard}>
          <h3 class={s.metadataCardTitle}>Step 4 - LLM Text Generation</h3>
          <div class={s.metadataItem}>
            <span class={s.metadataLabel}>Service</span>
            <span class={s.metadataValue}>
              {props.note.llm_service === 'openai'
                ? SERVICES_CONFIG.llm.openai.name
                : props.note.llm_service === 'anthropic'
                ? SERVICES_CONFIG.llm.anthropic.name
                : props.note.llm_service === 'gemini'
                ? SERVICES_CONFIG.llm.gemini.name
                : props.note.llm_service}
            </span>
          </div>
          <div class={s.metadataItem}>
            <span class={s.metadataLabel}>Model</span>
            <span class={s.metadataValue}>{props.note.llm_model || "N/A"}</span>
          </div>
          <div class={s.metadataItem}>
            <span class={s.metadataLabel}>Processing Time</span>
            <span class={s.metadataValue}>{props.formatProcessingTime(props.note.llm_processing_time)}</span>
          </div>
          <div class={s.metadataItem}>
            <span class={s.metadataLabel}>Input Tokens</span>
            <span class={s.metadataValue}>{props.note.llm_input_token_count?.toLocaleString() || "N/A"}</span>
          </div>
          <div class={s.metadataItem}>
            <span class={s.metadataLabel}>Output Tokens</span>
            <span class={s.metadataValue}>{props.note.llm_output_token_count?.toLocaleString() || "N/A"}</span>
          </div>
        </div>

        <div class={s.metadataCard}>
          <h3 class={s.metadataCardTitle}>Step 5 - Text-to-Speech</h3>
          <Show when={props.note.tts_enabled} fallback={
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Status</span>
              <span class={s.metadataValue}>Skipped</span>
            </div>
          }>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Service</span>
              <span class={s.metadataValue}>{props.note.tts_service === 'openai'
                ? SERVICES_CONFIG.tts.openai.name
                : props.note.tts_service === 'elevenlabs'
                ? SERVICES_CONFIG.tts.elevenlabs.name
                : props.note.tts_service || "Unknown"}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Model</span>
              <span class={s.metadataValue}>{props.note.tts_model || "N/A"}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Voice</span>
              <span class={s.metadataValue}>{props.note.tts_voice || "N/A"}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Processing Time</span>
              <span class={s.metadataValue}>{props.formatProcessingTime(props.note.tts_processing_time)}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Audio Duration</span>
              <span class={s.metadataValue}>{props.formatDuration(props.note.tts_audio_duration)}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Audio File</span>
              <span class={s.metadataValue}>{props.note.tts_audio_file || "N/A"}</span>
            </div>
          </Show>
        </div>

        <div class={s.metadataCard}>
          <h3 class={s.metadataCardTitle}>Step 6 - Image Generation</h3>
          <Show when={props.note.image_gen_enabled} fallback={
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Status</span>
              <span class={s.metadataValue}>Skipped</span>
            </div>
          }>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Service</span>
              <span class={s.metadataValue}>{SERVICES_CONFIG.imageGen.openai.name}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Model</span>
              <span class={s.metadataValue}>{props.note.image_gen_model || "N/A"}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Images Generated</span>
              <span class={s.metadataValue}>{props.note.images_generated || "0"}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Processing Time</span>
              <span class={s.metadataValue}>{props.formatProcessingTime(props.note.image_gen_processing_time)}</span>
            </div>
          </Show>
        </div>

        <div class={s.metadataCard}>
          <h3 class={s.metadataCardTitle}>Step 7 - Music Generation</h3>
          <Show when={props.note.music_gen_enabled} fallback={
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Status</span>
              <span class={s.metadataValue}>Skipped</span>
            </div>
          }>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Service</span>
              <span class={s.metadataValue}>{SERVICES_CONFIG.music.elevenlabs.name}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Model</span>
              <span class={s.metadataValue}>{props.note.music_gen_model || "N/A"}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Genre</span>
              <span class={s.metadataValue}>{props.formatMusicGenre(props.note.music_gen_genre)}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Processing Time</span>
              <span class={s.metadataValue}>{props.formatProcessingTime(props.note.music_gen_processing_time)}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Music Duration</span>
              <span class={s.metadataValue}>{props.formatDuration(props.note.music_gen_duration)}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Lyrics Length</span>
              <span class={s.metadataValue}>{props.note.music_gen_lyrics_length || "0"} characters</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Lyrics Gen Time</span>
              <span class={s.metadataValue}>{props.formatProcessingTime(props.note.music_gen_lyrics_generation_time)}</span>
            </div>
          </Show>
        </div>

        <div class={s.metadataCard}>
          <h3 class={s.metadataCardTitle}>Step 8 - Video Generation</h3>
          <Show when={props.note.video_gen_enabled} fallback={
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Status</span>
              <span class={s.metadataValue}>Skipped</span>
            </div>
          }>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Service</span>
              <span class={s.metadataValue}>{SERVICES_CONFIG.videoGen.openai.name}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Model</span>
              <span class={s.metadataValue}>{props.note.video_gen_model || "N/A"}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Videos Generated</span>
              <span class={s.metadataValue}>{props.note.videos_generated || "0"}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Video Size</span>
              <span class={s.metadataValue}>{props.note.video_size || "N/A"}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Video Duration</span>
              <span class={s.metadataValue}>{props.note.video_duration ? `${props.note.video_duration}s` : "N/A"}</span>
            </div>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Processing Time</span>
              <span class={s.metadataValue}>{props.formatProcessingTime(props.note.video_gen_processing_time)}</span>
            </div>
          </Show>
        </div>
      </div>
      </details>
    </section>
  )
}

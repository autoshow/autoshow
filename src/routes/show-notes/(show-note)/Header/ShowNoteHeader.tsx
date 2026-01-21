import { Show } from "solid-js"
import s from "./ShowNoteHeader.module.css"
import { SERVICES_CONFIG } from "~/utils/services"
import type { ShowNote } from "~/types/main"

type Props = {
  note: ShowNote
  formatDate: (timestamp: number) => string
}

export default function ShowNoteHeader(props: Props) {
  return (
    <header class={s.header}>
      <h1 class={s.title}>
        {props.note.title}
      </h1>

      <div class={s.metadata}>
        <Show when={props.note.author}>
          <span>👤 {props.note.author}</span>
        </Show>
        <Show when={props.note.duration}>
          <span>⏱️ {props.note.duration}</span>
        </Show>
        <span>📅 {props.formatDate(props.note.processed_at)}</span>
      </div>

      <div class={s.tags}>
        <span class={s.tagReverb}>
          {props.note.transcription_service === 'groq' 
            ? SERVICES_CONFIG.transcription.whisper.groq.name
            : props.note.transcription_service === 'deepinfra'
            ? SERVICES_CONFIG.transcription.whisper.deepinfra.name
            : props.note.transcription_service === 'happyscribe'
            ? SERVICES_CONFIG.transcription.streaming.happyscribe.name
            : props.note.transcription_service}
        </span>
        <span class={s.tagLlama}>
          {props.note.llm_service === 'openai'
            ? SERVICES_CONFIG.llm.openai.name
            : props.note.llm_service === 'anthropic'
            ? SERVICES_CONFIG.llm.anthropic.name
            : props.note.llm_service === 'gemini'
            ? SERVICES_CONFIG.llm.gemini.name
            : props.note.llm_service}
        </span>
        <Show when={props.note.tts_enabled}>
          <span class={s.tagTts}>
            {props.note.tts_service === 'openai'
              ? SERVICES_CONFIG.tts.openai.name
              : props.note.tts_service === 'elevenlabs'
              ? SERVICES_CONFIG.tts.elevenlabs.name
              : props.note.tts_service || "Unknown"}
          </span>
        </Show>
        <Show when={props.note.image_gen_enabled}>
          <span class={s.tagImageGen}>
            {props.note.image_gen_service === 'openai'
              ? SERVICES_CONFIG.imageGen.openai.name
              : props.note.image_gen_service || "Images Generated"}
          </span>
        </Show>
        <Show when={props.note.music_gen_enabled}>
          <span class={s.tagMusic}>
            {props.note.music_gen_service === 'elevenlabs'
              ? SERVICES_CONFIG.music.elevenlabs.name
              : props.note.music_gen_service || "Music Generated"}
          </span>
        </Show>
        <Show when={props.note.video_gen_enabled}>
          <span class={s.tagVideoGen}>
            {props.note.video_gen_service === 'openai'
              ? SERVICES_CONFIG.videoGen.openai.name
              : props.note.video_gen_service || "Video Generated"}
          </span>
        </Show>
      </div>

      <a 
        href={props.note.url}
        target="_blank"
        rel="noopener noreferrer"
        class={s.url}
      >
        🔗 {props.note.url}
      </a>

      <Show when={props.note.channel_url}>
        <a 
          href={props.note.channel_url!}
          target="_blank"
          rel="noopener noreferrer"
          class={s.url}
        >
          📺 {props.note.channel_url}
        </a>
      </Show>

      <Show when={props.note.video_thumbnail}>
        <img 
          src={props.note.video_thumbnail!}
          alt={props.note.title}
          class={s.thumbnail}
        />
      </Show>
    </header>
  )
}

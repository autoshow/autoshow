import { Show } from "solid-js"
import type { ShowNote } from "~/types"
import { TRANSCRIPTION_CONFIG, DOCUMENT_CONFIG, LLM_CONFIG, TTS_CONFIG, IMAGE_CONFIG, MUSIC_CONFIG, VIDEO_CONFIG } from "~/models"
import s from "./ShowNoteHeader.module.css"

type Props = {
  note: ShowNote
  formatDate: (timestamp: number) => string
}

export default function ShowNoteHeader(props: Props) {
  const getMusicServiceName = () => {
    const service = props.note.music_gen_service
    if (!service) return "Music Generated"
    return MUSIC_CONFIG[service as keyof typeof MUSIC_CONFIG]?.name || service
  }

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
        <Show when={props.note.transcription_service}>
          <span class={s.tagReverb}>
            {props.note.transcription_service === 'groq' 
              ? TRANSCRIPTION_CONFIG.whisper.groq.name
              : props.note.transcription_service === 'deepinfra'
              ? TRANSCRIPTION_CONFIG.whisper.deepinfra.name
              : props.note.transcription_service === 'happyscribe'
              ? TRANSCRIPTION_CONFIG.streaming.happyscribe.name
              : props.note.transcription_service === 'fal'
              ? TRANSCRIPTION_CONFIG.diarization.fal.name
              : props.note.transcription_service === 'gladia'
              ? TRANSCRIPTION_CONFIG.diarization.gladia.name
              : props.note.transcription_service}
          </span>
        </Show>
        <Show when={props.note.document_service}>
          <span class={s.tagReverb}>
            {props.note.document_service === 'llamaparse'
              ? DOCUMENT_CONFIG.llamaparse.name
              : props.note.document_service}
          </span>
        </Show>
        <span class={s.tagLlama}>
          {props.note.llm_service === 'openai'
            ? LLM_CONFIG.openai.name
            : props.note.llm_service === 'claude'
            ? LLM_CONFIG.claude.name
            : props.note.llm_service === 'gemini'
            ? LLM_CONFIG.gemini.name
            : props.note.llm_service}
        </span>
        <Show when={props.note.tts_enabled}>
          <span class={s.tagTts}>
            {props.note.tts_service === 'openai'
              ? TTS_CONFIG.openai.name
              : props.note.tts_service === 'elevenlabs'
              ? TTS_CONFIG.elevenlabs.name
              : props.note.tts_service || "Unknown"}
          </span>
        </Show>
        <Show when={props.note.image_gen_enabled}>
          <span class={s.tagImageGen}>
            {props.note.image_gen_service === 'openai'
              ? IMAGE_CONFIG.openai.name
              : props.note.image_gen_service || "Images Generated"}
          </span>
        </Show>
        <Show when={props.note.music_gen_enabled}>
          <span class={s.tagMusic}>
            {getMusicServiceName()}
          </span>
        </Show>
        <Show when={props.note.video_gen_enabled}>
          <span class={s.tagVideoGen}>
            {props.note.video_gen_service === 'openai'
              ? VIDEO_CONFIG.openai.name
              : props.note.video_gen_service === 'gemini'
              ? VIDEO_CONFIG.gemini?.name || "Gemini Veo"
              : props.note.video_gen_service === 'minimax'
              ? VIDEO_CONFIG.minimax.name
              : props.note.video_gen_service === 'grok'
              ? VIDEO_CONFIG.grok.name
              : props.note.video_gen_service || "Video Generated"}
          </span>
        </Show>
      </div>

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

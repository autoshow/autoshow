import { Title } from "@solidjs/meta"
import { For, Show } from "solid-js"
import { A, type RouteDefinition, createAsync } from "@solidjs/router"
import { getShowNotes } from "~/database/notes/show-notes-query"
import { TRANSCRIPTION_CONFIG, DOCUMENT_CONFIG, LLM_CONFIG, TTS_CONFIG, IMAGE_CONFIG, MUSIC_CONFIG, VIDEO_CONFIG } from "~/models"
import s from "./show-notes.module.css"

export const route = {
  preload: () => getShowNotes()
} satisfies RouteDefinition

export default function ShowNotes() {
  const showNotes = createAsync(() => getShowNotes())

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  const getMusicServiceName = (service: string | null | undefined): string => {
    if (!service) return "Music Generated"
    return MUSIC_CONFIG[service as keyof typeof MUSIC_CONFIG]?.name || service
  }

  return (
    <main class={s.main}>
      <Title>Show Notes Library - Autoshow</Title>
      <div class={s.container}>
        <header class={s.header}>
          <div class={s.headerTop}>
            <h1 class={s.title}>
              Show Notes Library
            </h1>
          </div>
          <p class={s.subtitle}>
            All your transcriptions and AI-generated show notes in one place
          </p>
          
          <Show when={showNotes()}>
            <div class={s.stats}>
              <div class={s.stat}>
                <span class={s.statNumber}>{showNotes()?.length || 0}</span>
                <span class={s.statLabel}>Show Notes</span>
              </div>
            </div>
          </Show>

          <A href="/create" class={s.createButton}>
            + Create New Note
          </A>
        </header>

        <Show
          when={showNotes()}
          fallback={
            <div class={s.loading}>
              Loading show notes...
            </div>
          }
        >
          <div class={s.grid}>
            <For each={showNotes()}>
              {(note) => (
                <A href={`/show-notes/${note.id}`} class={s.card}>
                  <div class={s.cardInner}>
                    <h3 class={s.cardTitle}>
                      {note.title}
                    </h3>
                    
                    <div class={s.cardMetadata}>
                      <Show when={note.author}>
                        <span>👤 {note.author}</span>
                      </Show>
                      <Show when={note.duration}>
                        <span>⏱️ {note.duration}</span>
                      </Show>
                      <span>📅 {formatDate(note.processed_at)}</span>
                    </div>

                    <div class={s.cardTags}>
                      <Show when={note.transcription_service}>
                        <span class={s.tagReverb}>
                          {note.transcription_service === 'groq' 
                            ? TRANSCRIPTION_CONFIG.whisper.groq.name
                            : note.transcription_service === 'deepinfra'
                            ? TRANSCRIPTION_CONFIG.whisper.deepinfra.name
                            : note.transcription_service === 'happyscribe'
                            ? TRANSCRIPTION_CONFIG.streaming.happyscribe.name
                            : note.transcription_service === 'fal'
                            ? TRANSCRIPTION_CONFIG.diarization.fal.name
                            : note.transcription_service === 'gladia'
                            ? TRANSCRIPTION_CONFIG.diarization.gladia.name
                            : note.transcription_service}
                        </span>
                      </Show>
                      <Show when={note.document_service}>
                        <span class={s.tagReverb}>
                          {note.document_service === 'llamaparse'
                            ? DOCUMENT_CONFIG.llamaparse.name
                            : note.document_service}
                        </span>
                      </Show>
                      <span class={s.tagLlama}>
                        {note.llm_service === 'openai' 
                          ? LLM_CONFIG.openai.name
                          : note.llm_service === 'claude'
                          ? LLM_CONFIG.claude.name
                          : note.llm_service === 'gemini'
                          ? LLM_CONFIG.gemini.name
                          : note.llm_service}
                      </span>
                      <Show when={note.tts_enabled === true}>
                        <span class={s.tagTts}>
                          {note.tts_service === 'openai'
                            ? TTS_CONFIG.openai.name
                            : TTS_CONFIG.elevenlabs.name}
                        </span>
                      </Show>
                      <Show when={note.image_gen_enabled === true}>
                        <span class={s.tagImageGen}>
                          {IMAGE_CONFIG.openai.name}
                        </span>
                      </Show>
                      <Show when={note.music_gen_enabled === true}>
                        <span class={s.tagMusic}>
                          {getMusicServiceName(note.music_gen_service)}
                        </span>
                      </Show>
                      <Show when={note.video_gen_enabled === true}>
                        <span class={s.tagVideoGen}>
                          {VIDEO_CONFIG.openai.name}
                        </span>
                      </Show>
                    </div>
                  </div>
                </A>
              )}
            </For>
          </div>
        </Show>
      </div>
    </main>
  )
}

import { Title } from "@solidjs/meta"
import { For, Show } from "solid-js"
import { A, type RouteDefinition, createAsync } from "@solidjs/router"
import s from "./show-notes.module.css"
import { getShowNotes } from "~/database/notes/show-notes-query"
import { SERVICES_CONFIG } from "~/utils/services"

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
                      <span class={s.tagReverb}>
                        {note.transcription_service === 'groq' 
                          ? SERVICES_CONFIG.transcription.whisper.groq.name
                          : note.transcription_service === 'deepinfra'
                          ? SERVICES_CONFIG.transcription.whisper.deepinfra.name
                          : SERVICES_CONFIG.transcription.streaming.happyscribe.name}
                      </span>
                      <span class={s.tagLlama}>
                        {note.llm_service === 'openai' 
                          ? SERVICES_CONFIG.llm.openai.name
                          : note.llm_service === 'anthropic'
                          ? SERVICES_CONFIG.llm.anthropic.name
                          : note.llm_service === 'gemini'
                          ? SERVICES_CONFIG.llm.gemini.name
                          : note.llm_service}
                      </span>
                      <Show when={note.tts_enabled === 1}>
                        <span class={s.tagTts}>
                          {note.tts_service === 'openai'
                            ? SERVICES_CONFIG.tts.openai.name
                            : SERVICES_CONFIG.tts.elevenlabs.name}
                        </span>
                      </Show>
                      <Show when={note.image_gen_enabled === 1}>
                        <span class={s.tagImageGen}>
                          {SERVICES_CONFIG.imageGen.openai.name}
                        </span>
                      </Show>
                      <Show when={note.music_gen_enabled === 1}>
                        <span class={s.tagMusic}>
                          {SERVICES_CONFIG.music.elevenlabs.name}
                        </span>
                      </Show>
                      <Show when={note.video_gen_enabled === 1}>
                        <span class={s.tagVideoGen}>
                          {SERVICES_CONFIG.videoGen.openai.name}
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

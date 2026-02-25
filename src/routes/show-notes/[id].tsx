import { Title } from "@solidjs/meta"
import { Show } from "solid-js"
import { A, useParams, type RouteDefinition, createAsync } from "@solidjs/router"
import s from "./show-note.module.css"
import { getShowNote } from "~/database/notes/show-note-query"
import ShowNoteHeader from "./Header/ShowNoteHeader"
import ShowNoteContent from "./Content/ShowNoteContent"
import ShowNoteProcessingDetails from "./ProcessingDetails/ShowNoteProcessingDetails"

export const route = {
  preload: ({ params }) => {
    const id = params["id"]
    if (!id) {
      return undefined
    }
    return getShowNote(id)
  }
} satisfies RouteDefinition

export default function ShowNote() {
  const params = useParams()
  const showNote = createAsync(() => {
    const id = params["id"]
    if (!id) {
      throw new Error("No ID provided")
    }
    return getShowNote(id)
  })

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const formatFileSize = (bytes: number | null | undefined): string => {
    if (bytes === null || bytes === undefined) return "Unknown"
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const formatProcessingTime = (ms: number | null | undefined): string => {
    if (ms === null || ms === undefined) return "Unknown"
    const seconds = ms / 1000
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = seconds / 60
    return `${minutes.toFixed(1)}m`
  }

  const formatDuration = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined) return "Unknown"
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const getAudioUrl = (id: string, audioFileName: string | null | undefined): string => {
    if (!audioFileName) return ""
    return `/api/media/audio/${id}/${audioFileName}`
  }

  const getImageUrl = (id: string, imageFileName: string | null | undefined): string => {
    if (!imageFileName) return ""
    return `/api/media/image/${id}/${imageFileName}`
  }

  const getVideoUrl = (id: string, videoFileName: string | null | undefined): string => {
    if (!videoFileName) return ""
    return `/api/media/video/${id}/${videoFileName}`
  }

  const getImageFiles = (imageFilesString: string | null | undefined): string[] => {
    if (!imageFilesString) return []
    return imageFilesString.split(',').filter(f => f.trim().length > 0)
  }

  const getVideoFiles = (videoFilesString: string | null | undefined): string[] => {
    if (!videoFilesString) return []
    return videoFilesString.split(',').filter(f => f.trim().length > 0)
  }

  const formatMusicGenre = (genre: string | null | undefined): string => {
    if (!genre) return "Unknown"
    return genre.charAt(0).toUpperCase() + genre.slice(1)
  }

  return (
    <div class={s.container}>
      <Title>Show Note - Autoshow</Title>
      <div class={s.innerContainer}>
        <A href="/" class={s.backLink}>
          ← Back to dashboard
        </A>

        <Show
          when={showNote()}
          fallback={
            <div class={s.loading}>
              Loading show note...
            </div>
          }
        >
          {(note) => (
            <article class={s.article}>
              <ShowNoteHeader 
                note={note()}
                formatDate={formatDate}
              />

              <ShowNoteContent
                note={note()}
                formatDuration={formatDuration}
                formatMusicGenre={formatMusicGenre}
                getAudioUrl={getAudioUrl}
                getImageUrl={getImageUrl}
                getVideoUrl={getVideoUrl}
                getImageFiles={getImageFiles}
                getVideoFiles={getVideoFiles}
              />

              <ShowNoteProcessingDetails
                note={note()}
                formatFileSize={formatFileSize}
                formatProcessingTime={formatProcessingTime}
                formatDuration={formatDuration}
                formatMusicGenre={formatMusicGenre}
              />

              <section>
                <h2 class={s.sectionTitle}>
                  Full Prompt
                </h2>
                <details>
                  <summary class={s.detailsSummary}>
                    Click to expand prompt
                  </summary>
                  <div class={s.promptBox}>
                    {note().prompt}
                  </div>
                </details>
              </section>
            </article>
          )}
        </Show>
      </div>
    </div>
  )
}

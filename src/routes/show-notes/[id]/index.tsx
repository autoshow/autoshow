import clsx from "clsx"
import { Link,Meta,Title } from "@solidjs/meta"
import { A,createAsync,query,useParams,type RouteDefinition } from "@solidjs/router"
import { HttpStatusCode } from "@solidjs/start"
import { Show,createMemo } from "solid-js"
import ui from "~/styles/ui.module.css"
import type { ShowNote } from "~/types"
import ShowNoteContent from "../Content/ShowNoteContent"
import ShowNoteHeader from "../Header/ShowNoteHeader"
import ShowNoteProcessingDetails from "../ProcessingDetails/ShowNoteProcessingDetails"
import shared from "../shared.module.css"
import s from "../show-note.module.css"

const MAX_META_DESCRIPTION_LENGTH = 180

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim()

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1).trimEnd()}…`
}

const findFirstMeaningfulText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const normalized = normalizeWhitespace(value)
    return normalized.length > 0 ? normalized : null
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = findFirstMeaningfulText(entry)
      if (candidate) return candidate
    }
    return null
  }

  if (value && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      const candidate = findFirstMeaningfulText(entry)
      if (candidate) return candidate
    }
  }

  return null
}

const getShowNoteDescription = (note: ShowNote) => {
  const textOutput = note.text_output?.trim()

  if (textOutput) {
    try {
      const parsed = JSON.parse(textOutput) as unknown
      const extracted = findFirstMeaningfulText(parsed)
      if (extracted) {
        return truncateText(extracted, MAX_META_DESCRIPTION_LENGTH)
      }
    } catch {
      const normalizedText = normalizeWhitespace(textOutput)
      if (normalizedText.length > 0) {
        return truncateText(normalizedText, MAX_META_DESCRIPTION_LENGTH)
      }
    }
  }

  const transcriptionExcerpt = normalizeWhitespace(note.transcription)
  if (transcriptionExcerpt.length > 0) {
    return truncateText(transcriptionExcerpt, MAX_META_DESCRIPTION_LENGTH)
  }

  return truncateText(`AutoShow note: ${note.title}`, MAX_META_DESCRIPTION_LENGTH)
}

const getShowNote = query(async (id) => {
  "use server"

  const { getDatabase, initializeSchema } = await import("~/database/db")
  const { getShowNoteForViewer } = await import("~/database/notes/show-note-access")
  const { renderShowNoteTextOutputMaps } = await import("~/routes/show-notes/rendered-text-output")
  const { buildAbsoluteUrl } = await import("~/utils/site-url")
  const {
    buildShowNoteStorageLinks,
    sanitizeShowNoteAssetsForClient,
    sanitizeShowNoteForClient,
  } = await import("~/utils/show-note-storage")

  const db = getDatabase()
  await initializeSchema(db)

  const noteId = typeof id === "string" ? id : String(id ?? "")
  const showNote = await getShowNoteForViewer(db, noteId)
  if (!showNote) {
    return null
  }

  const renderedTextOutputs = renderShowNoteTextOutputMaps(showNote.note.text_output, showNote.assets)
  const storageLinks = buildShowNoteStorageLinks(showNote.note, showNote.assets)

  return {
    note: sanitizeShowNoteForClient(showNote.note),
    assets: sanitizeShowNoteAssetsForClient(showNote.assets),
    renderedTextOutput: renderedTextOutputs.renderedTextOutput,
    renderedAssetTextOutputs: renderedTextOutputs.renderedAssetTextOutputs,
    canManage: true,
    publicUrl: buildAbsoluteUrl(`/show-notes/${showNote.note.id}`),
    storageLinks,
  }
}, "show-note")

export const route: RouteDefinition = {
  preload: ({ params }) => {
    const id = params["id"]
    if (!id) {
      return undefined
    }
    return getShowNote(id)
  }
}

export default function ShowNote() {
  const params = useParams()
  const showNote = createAsync(() => {
    const id = params["id"]
    if (!id) {
      throw new Error("No ID provided")
    }
    return getShowNote(id)
  })

  const showNoteData = createMemo(() => showNote() ?? showNote.latest ?? null)
  const displayShowNoteData = createMemo(() => showNoteData())
  const isLoading = createMemo(() => showNote() === undefined && showNote.latest === undefined)
  const pageTitle = createMemo(() => {
    if (isLoading()) {
      return "Show Note - AutoShow"
    }

    const data = showNoteData()
    return data ? `${data.note.title} - AutoShow` : "Show Note Not Found - AutoShow"
  })
  const seoDescription = createMemo(() => {
    const data = displayShowNoteData()
    if (!data) {
      return "This show note is unavailable."
    }

    return getShowNoteDescription(data.note)
  })
  const robotsContent = createMemo(() => {
    const data = displayShowNoteData()
    return data ? "index, follow" : "noindex, nofollow"
  })

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const formatFileSize = (bytes: number | null | undefined) => {
    if (bytes === null || bytes === undefined) return "Unknown"
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const formatProcessingTime = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined) return "Unknown"
    const seconds = ms / 1000
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = seconds / 60
    return `${minutes.toFixed(1)}m`
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return "Unknown"
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const getAudioUrl = (id: string, audioFileName: string | null | undefined) => {
    if (!audioFileName) return ""
    return `/api/media/audio/${id}/${audioFileName}`
  }

  const getImageUrl = (id: string, imageFileName: string | null | undefined) => {
    if (!imageFileName) return ""
    return `/api/media/image/${id}/${imageFileName}`
  }

  const getVideoUrl = (id: string, videoFileName: string | null | undefined) => {
    if (!videoFileName) return ""
    return `/api/media/video/${id}/${videoFileName}`
  }

  const getImageFiles = (imageFilesString: string | null | undefined) => {
    if (!imageFilesString) return []
    return imageFilesString.split(',').filter(f => f.trim().length > 0)
  }

  const getVideoFiles = (videoFilesString: string | null | undefined) => {
    if (!videoFilesString) return []
    return videoFilesString.split(',').filter(f => f.trim().length > 0)
  }

  const formatMusicGenre = (genre: string | null | undefined) => {
    if (!genre) return "Unknown"
    return genre.charAt(0).toUpperCase() + genre.slice(1)
  }

  return (
    <div class={clsx(ui.page, ui.pagePadded)}>
      <Title>{pageTitle()}</Title>
      <Meta name="description" content={seoDescription()} />
      <Meta name="robots" content={robotsContent()} />

      <Show when={displayShowNoteData()}>
        {(data) => (
          <>
            <Link rel="canonical" href={data().publicUrl} />
            <Meta property="og:type" content="article" />
            <Meta property="og:title" content={`${data().note.title} - AutoShow`} />
            <Meta property="og:description" content={seoDescription()} />
            <Meta property="og:url" content={data().publicUrl} />
            <Meta property="og:site_name" content="AutoShow" />
            <Show when={data().note.video_thumbnail}>
              <Meta property="og:image" content={data().note.video_thumbnail!} />
            </Show>
            <Meta name="twitter:card" content={data().note.video_thumbnail ? "summary_large_image" : "summary"} />
            <Meta name="twitter:title" content={`${data().note.title} - AutoShow`} />
            <Meta name="twitter:description" content={seoDescription()} />
            <Show when={data().note.video_thumbnail}>
              <Meta name="twitter:image" content={data().note.video_thumbnail!} />
            </Show>
          </>
        )}
      </Show>

      <div class={clsx(ui.container, s.innerContainer)}>
        <Show when={!isLoading()} fallback={
          <div class={s.loading}>
            <div class={clsx(ui.surface, ui.surfacePaddedLarge, s.skeleton)}>
              <div class={ui.skeletonTitle} />
              <div class={ui.skeletonLine} />
              <div class={ui.skeletonLine} />
              <div class={ui.skeletonLineShort} />
              <div class={clsx(ui.skeletonBlock, s.skeletonBlock)} />
            </div>
          </div>
        }>
          <Show
            when={displayShowNoteData()}
            fallback={
              <main class={clsx(ui.surface, ui.surfacePaddedLarge, s.notFoundCard)}>
                <HttpStatusCode code={404} />
                <h1 class={s.notFoundTitle}>Show Note Not Found</h1>
                <p class={s.notFoundText}>
                  This show note is unavailable.
                </p>
                <A href="/" class={s.backLink}>
                  ← Back to home
                </A>
              </main>
            }
          >
            {(data) => (
              <article class={clsx(ui.surface, ui.surfacePaddedLarge, s.article)}>
                <A href="/show-notes" class={s.backLink}>
                  ← Back to dashboard
                </A>

                <ShowNoteHeader
                  note={data().note}
                  formatDate={formatDate}
                  canManage={data().canManage}
                  addAssetsHref={`/show-notes/${data().note.id}/add-assets`}
                />

                <ShowNoteContent
                  note={data().note}
                  assets={data().assets}
                  renderedTextOutput={data().renderedTextOutput}
                  renderedAssetTextOutputs={data().renderedAssetTextOutputs}
                  formatDuration={formatDuration}
                  formatMusicGenre={formatMusicGenre}
                  getAudioUrl={getAudioUrl}
                  getImageUrl={getImageUrl}
                  getVideoUrl={getVideoUrl}
                  getImageFiles={getImageFiles}
                  getVideoFiles={getVideoFiles}
                />

                <Show when={data().canManage}>
                  <ShowNoteProcessingDetails
                    note={data().note}
                    assets={data().assets}
                    storageLinks={data().storageLinks}
                    formatFileSize={formatFileSize}
                    formatProcessingTime={formatProcessingTime}
                    formatDuration={formatDuration}
                    formatMusicGenre={formatMusicGenre}
                  />

                  <section>
                    <h2 class={shared.sectionTitle}>
                      Full Prompt
                    </h2>
                    <details>
                      <summary class={shared.detailsSummary}>
                        Click to expand prompt
                      </summary>
                      <div class={clsx(shared.codeBlock, s.promptBox)}>
                        {data().note.prompt}
                      </div>
                    </details>
                  </section>
                </Show>
              </article>
            )}
          </Show>
        </Show>
      </div>
    </div>
  )
}

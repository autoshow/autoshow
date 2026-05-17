import clsx from "clsx"
import { Title } from "@solidjs/meta"
import { A,type RouteDefinition,createAsync,revalidate } from "@solidjs/router"
import { For,Show,createEffect,createMemo,createSignal,on } from "solid-js"
import { getShowNotes } from "~/database/notes/show-notes-query"
import {
DOCUMENT_CONFIG,
getImageServiceName,
getLLMServiceName,
getMusicServiceName,
getTTSServiceName,
getTranscriptionServiceName,
getVideoServiceName,
} from "~/models"
import ui from "~/styles/ui.module.css"
import s from "./show-notes.module.css"
import { getShowNotesListState } from "./show-notes-list-state"

export const route: RouteDefinition = {
  preload: () => getShowNotes()
}

export default function ShowNotes() {
  const showNotes = createAsync(() => getShowNotes())
  const [locallyDeletedIds, setLocallyDeletedIds] = createSignal<string[]>([])
  const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<string | null>(null)
  const [deletingId, setDeletingId] = createSignal<string | null>(null)
  const [deleteError, setDeleteError] = createSignal<string | null>(null)
  const [deleteDialog, setDeleteDialog] = createSignal<HTMLDialogElement | null>(null)
  const showNotesList = createMemo(() => getShowNotesListState(
    showNotes(),
    showNotes.latest,
    locallyDeletedIds()
  ))

  const applyDeleteDialogOpenState = (dialog: HTMLDialogElement | null, shouldOpen: boolean) => {
    if (!dialog) return

    if (shouldOpen) {
      if (!dialog.open) {
        if (typeof dialog.showModal === "function") {
          dialog.showModal()
        } else {
          dialog.setAttribute("open", "")
        }
      }
      return
    }

    if (dialog.open) {
      dialog.close()
    } else {
      dialog.removeAttribute("open")
    }
  }

  createEffect(on(
    () => [deleteDialog(), confirmingDeleteId() !== null] as const,
    ([dialog, shouldOpen]) => applyDeleteDialogOpenState(dialog, shouldOpen)
  ))

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  const visibleNotes = () => {
    return showNotesList().notes
  }

  const notePendingDelete = () => {
    const noteId = confirmingDeleteId()
    if (!noteId) return null
    return visibleNotes().find(note => note.id === noteId) ?? null
  }

  const openDeleteDialog = (noteId: string) => {
    if (deletingId()) return
    setDeleteError(null)
    setConfirmingDeleteId(noteId)
  }

  const closeDeleteDialog = () => {
    if (deletingId()) return
    setDeleteError(null)
    setConfirmingDeleteId(null)
  }

  const handleDeleteDialogClose = () => {
    if (!deletingId()) {
      setDeleteError(null)
      setConfirmingDeleteId(null)
    }
  }

  const confirmDelete = async () => {
    const note = notePendingDelete()
    if (!note) return

    setDeleteError(null)
    setDeletingId(note.id)

    try {
      const response = await fetch(`/api/show-notes/${note.id}`, {
        method: "DELETE",
      })
      const payload = await response.json().catch(() => null) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete show note")
      }

      setLocallyDeletedIds(ids => ids.includes(note.id) ? ids : [...ids, note.id])
      await revalidate(getShowNotes.key)
      setDeletingId(null)
      setConfirmingDeleteId(null)
    } catch (error) {
      setDeletingId(null)
      setDeleteError(error instanceof Error ? error.message : "Failed to delete show note")
    }
  }

  const retryLoad = async () => {
    await revalidate(getShowNotes.key)
  }

  return (
    <main class={clsx(ui.page, ui.pagePadded)}>
      <Title>Show Notes Library - Autoshow</Title>
      <div class={clsx(ui.container, s.container)}>
        <header class={s.header}>
          <div class={s.headerTop}>
            <h1 class={s.title}>
              Show Notes Library
            </h1>
          </div>
          <p class={s.subtitle}>
            All transcriptions and AI-generated show notes in one place
          </p>

          <Show when={showNotesList().status === "ready"}>
            <div class={s.stats}>
              <div class={clsx(ui.surface, ui.surfacePadded, s.stat)}>
                <span class={s.statNumber}>{visibleNotes().length}</span>
                <span class={s.statLabel}>Show Notes</span>
              </div>
            </div>
          </Show>

          <A href="/create" class={clsx(ui.action, ui.actionPrimary, ui.actionLarge, ui.actionLift)}>
            + Create New Note
          </A>
        </header>

        <Show
          when={showNotesList().status !== "loading"}
          fallback={
            <div class={s.loading}>
              <div class={clsx(ui.surface, ui.surfacePadded, s.skeleton)}>
                <div class={ui.skeletonTitle} />
                <div class={ui.skeletonLine} />
                <div class={ui.skeletonLineShort} />
                <div class={s.skeletonTags}>
                  <div class={ui.skeletonChip} />
                  <div class={ui.skeletonChip} />
                </div>
              </div>
              <div class={clsx(ui.surface, ui.surfacePadded, s.skeleton)}>
                <div class={ui.skeletonTitle} />
                <div class={ui.skeletonLine} />
                <div class={ui.skeletonLineShort} />
                <div class={s.skeletonTags}>
                  <div class={ui.skeletonChip} />
                  <div class={ui.skeletonChip} />
                </div>
              </div>
              <div class={clsx(ui.surface, ui.surfacePadded, s.skeleton)}>
                <div class={ui.skeletonTitle} />
                <div class={ui.skeletonLine} />
                <div class={ui.skeletonLineShort} />
                <div class={s.skeletonTags}>
                  <div class={ui.skeletonChip} />
                  <div class={ui.skeletonChip} />
                </div>
              </div>
            </div>
          }
        >
          <Show
            when={showNotesList().status !== "invalid"}
            fallback={
              <div class={clsx(ui.surface, ui.surfacePaddedLarge, s.loadError)}>
                <h2 class={s.emptyTitle}>Show notes unavailable</h2>
                <p class={s.emptyText}>
                  Autoshow received an unexpected response while loading your library.
                </p>
                <button
                  type="button"
                  class={clsx(ui.action, ui.actionPrimary, ui.actionLarge, ui.actionLift)}
                  onClick={() => void retryLoad()}
                >
                  Retry
                </button>
              </div>
            }
          >
            <Show
              when={visibleNotes().length > 0}
              fallback={
                <div class={clsx(ui.surface, ui.surfacePaddedLarge, s.emptyState)}>
                  <h2 class={s.emptyTitle}>No show notes yet</h2>
                  <p class={s.emptyText}>
                    Create a new note to start building your library.
                  </p>
                  <A href="/create" class={clsx(ui.action, ui.actionPrimary, ui.actionLarge, ui.actionLift)}>
                    Create Your First Note
                  </A>
                </div>
              }
            >
              <div class={s.grid}>
                <For each={visibleNotes()}>
                  {(note) => (
                    <article class={clsx(ui.surface, ui.surfaceInteractive, s.card)}>
                      <div class={s.cardInner}>
                        <div class={s.cardHeader}>
                          <A href={`/show-notes/${note.id}`} class={s.cardTitleLink}>
                            <div class={s.cardTitleStack}>
                              <h3 class={s.cardTitle}>
                                {note.title}
                              </h3>
                            </div>
                          </A>

                          <button
                            type="button"
                            class={clsx(ui.action, ui.actionDanger, ui.actionIcon, ui.actionLift, s.deleteButton)}
                            aria-label={`Delete show note ${note.title}`}
                            title="Delete show note"
                            onClick={() => openDeleteDialog(note.id)}
                            disabled={deletingId() !== null}
                          >
                            <svg
                              class={s.deleteIcon}
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                d="M9 3.75h6a1.5 1.5 0 0 1 1.5 1.5v.75H21a.75.75 0 0 1 0 1.5h-1.08l-.72 11.35A2.25 2.25 0 0 1 16.96 21H7.04a2.25 2.25 0 0 1-2.24-2.15L4.08 7.5H3a.75.75 0 0 1 0-1.5h4.5v-.75A1.5 1.5 0 0 1 9 3.75Zm6 2.25v-.75h-6V6h6ZM6.3 7.5l.7 11.26a.75.75 0 0 0 .75.74h8.5a.75.75 0 0 0 .75-.74l.7-11.26H6.3Zm3.45 2.25c.41 0 .75.34.75.75v5.25a.75.75 0 0 1-1.5 0V10.5c0-.41.34-.75.75-.75Zm4.5 0c.41 0 .75.34.75.75v5.25a.75.75 0 0 1-1.5 0V10.5c0-.41.34-.75.75-.75Z"
                                fill="currentColor"
                              />
                            </svg>
                          </button>
                        </div>

                        <A href={`/show-notes/${note.id}`} class={s.cardPrimaryLink}>
                          <div class={clsx(ui.actionRow, s.cardMetadata)}>
                            <Show when={note.author}>
                              <span>{note.author}</span>
                            </Show>
                            <Show when={note.duration}>
                              <span>{note.duration}</span>
                            </Show>
                            <span>{formatDate(note.processed_at)}</span>
                          </div>

                          <div class={s.cardTags}>
                            <Show when={note.transcription_service}>
                              <span class={ui.chip}>
                                {getTranscriptionServiceName(note.transcription_service)}
                              </span>
                            </Show>
                            <Show when={note.document_service}>
                              <span class={ui.chip}>
                                {DOCUMENT_CONFIG[note.document_service as keyof typeof DOCUMENT_CONFIG]?.name || note.document_service}
                              </span>
                            </Show>
                            <span class={ui.chip}>
                              {getLLMServiceName(note.llm_service)}
                            </span>
                            <Show when={note.tts_enabled === true}>
                              <span class={ui.chip}>
                                {getTTSServiceName(note.tts_service)}
                              </span>
                            </Show>
                            <Show when={note.image_gen_enabled === true}>
                              <span class={ui.chip}>
                                {getImageServiceName(note.image_gen_service)}
                              </span>
                            </Show>
                            <Show when={note.music_gen_enabled === true}>
                              <span class={ui.chip}>
                                {getMusicServiceName(note.music_gen_service)}
                              </span>
                            </Show>
                            <Show when={note.video_gen_enabled === true}>
                              <span class={ui.chip}>
                                {getVideoServiceName(note.video_gen_service)}
                              </span>
                            </Show>
                          </div>
                        </A>
                      </div>
                    </article>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </Show>

        <dialog
          ref={setDeleteDialog}
          class={s.dialog}
          onClose={handleDeleteDialogClose}
          onCancel={(event) => {
            if (deletingId()) {
              event.preventDefault()
            }
          }}
          aria-labelledby="delete-show-note-title"
        >
          <Show when={notePendingDelete()}>
            {(note) => (
              <div class={s.dialogBody}>
                <h2 id="delete-show-note-title" class={s.dialogTitle}>
                  Delete show note?
                </h2>
                <p class={s.dialogText}>
                  This will delete <span class={s.dialogNoteTitle}>{note().title}</span> and remove it from your show notes page.
                </p>
                <p class={s.dialogSubtext}>
                  This action cannot be undone from the library.
                </p>

                <Show when={deleteError()}>
                  <p class={clsx(ui.statusCompact, ui.statusDanger, s.dialogError)} role="alert">
                    {deleteError()}
                  </p>
                </Show>

                <div class={clsx(ui.actionRow, s.dialogActions)}>
                  <button
                    type="button"
                    class={clsx(ui.action, ui.actionSecondary, ui.actionLift, s.cancelButton)}
                    onClick={closeDeleteDialog}
                    disabled={deletingId() !== null}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class={clsx(ui.action, ui.actionDanger, ui.actionLift, s.confirmDeleteButton)}
                    onClick={() => void confirmDelete()}
                    disabled={deletingId() !== null}
                  >
                    {deletingId() === note().id ? "Deleting..." : "Delete show note"}
                  </button>
                </div>
              </div>
            )}
          </Show>
        </dialog>
      </div>
    </main>
  )
}

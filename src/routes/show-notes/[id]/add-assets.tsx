import clsx from "clsx"
import { Title } from "@solidjs/meta"
import { A,action,createAsync,query,useNavigate,useParams,useSearchParams,useSubmission,type RouteDefinition } from "@solidjs/router"
import { HttpStatusCode } from "@solidjs/start"
import { Show,createEffect,createMemo,createSignal,on,onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { requiresExplicitVideoAspectRatioSelection } from "~/models"
import ProgressTracker from "~/routes/create/ProgressComponents/ProgressTracker"
import { createInitialStepsState } from "~/routes/create/create-state"
import createStyles from "~/routes/create/create.module.css"
import { jobToProgressUpdate } from "~/routes/create/progress-update"
import Steps from "~/routes/create/StepsComponents/Steps"
import ui from "~/styles/ui.module.css"
import type { Job,ShowNote } from "~/types"
import s from "../show-note.module.css"

const submitAppendAssets = action(async (formData: FormData) => {
  const showNoteId = String(formData.get('showNoteId') ?? '')
  formData.delete('showNoteId')

  if (!showNoteId) {
    throw new Error('Show note ID is required')
  }

  const response = await fetch(`/api/show-notes/${encodeURIComponent(showNoteId)}/assets`, {
    method: 'POST',
    body: formData
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to start append asset generation')
  }
  const { jobId } = await response.json()
  return { jobId }
}, "submitAppendAssets")

type SubmitAppendAssetsResult = { jobId: string }

type AddAssetsRouteData = {
  note: ShowNote
  hasTextOutput: boolean
}

const getAddAssetsData = query(async (id) => {
  "use server"

  const { getDatabase, initializeSchema } = await import("~/database/db")
  const { getShowNoteById } = await import("~/database/notes/show-note-access")
  const { getShowNoteAssets } = await import("~/database/notes/show-note-assets")

  const db = getDatabase()
  await initializeSchema(db)

  const noteId = typeof id === "string" ? id : String(id ?? "")
  const note = await getShowNoteById(db, noteId)
  if (!note) {
    return null
  }

  const assets = await getShowNoteAssets(db, note.id)

  return {
    note,
    hasTextOutput: !!note.text_output?.trim() || assets.some(asset => asset.kind === 'llm')
  } satisfies AddAssetsRouteData
}, "show-note-add-assets")

export const route: RouteDefinition = {
  preload: ({ params }) => {
    const id = params["id"]
    if (!id) {
      return undefined
    }
    return getAddAssetsData(id)
  }
}

export default function AddAssets() {
  const params = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const routeData = createAsync(() => {
    const id = params["id"]
    if (!id) {
      throw new Error("No ID provided")
    }
    return getAddAssetsData(id)
  })
  const submission = useSubmission(submitAppendAssets)
  const [jobProgress, setJobProgress] = createSignal<Job | null>(null)
  const [state, setState] = createStore(createInitialStepsState())

  const data = createMemo(() => routeData() ?? routeData.latest ?? null)
  const isLoading = createMemo(() => routeData() === undefined && routeData.latest === undefined)

  async function fetchJobProgress(jobId: string) {
    try {
      const response = await fetch(`/api/jobs/${jobId}`)
      if (!response.ok) {
        setSearchParams({ job: undefined }, { replace: true })
        return
      }
      const job: Job = await response.json()
      setJobProgress(job)
      if (job.status === 'completed' && job.showNoteId) {
        navigate(`/show-notes/${job.showNoteId}`)
      }
    } catch {
    }
  }

  const submissionResult = (): SubmitAppendAssetsResult | undefined => submission.result as SubmitAppendAssetsResult | undefined
  const submittedJobId = (): string | undefined => submissionResult()?.jobId
  const activeJobId = (): string | undefined => {
    const jobIdParam = searchParams.job
    return typeof jobIdParam === 'string' ? jobIdParam : undefined
  }

  createEffect(on(
    () => [submittedJobId(), activeJobId()] as const,
    ([jobId, currentJobId]) => {
      if (jobId && currentJobId !== jobId) {
        setSearchParams({ job: jobId }, { replace: true })
      }
    }
  ))

  createEffect(on(activeJobId, (jobId) => {
    if (!jobId) return
    void fetchJobProgress(jobId)
    const interval = setInterval(() => fetchJobProgress(jobId), 1000)
    onCleanup(() => clearInterval(interval))
  }))

  const isProcessing = () => {
    if (submission.pending) return true
    const job = jobProgress()
    return job?.status === 'pending' || job?.status === 'processing'
  }

  const processingError = () => {
    if (submission.error) return submission.error.message
    const job = jobProgress()
    return job?.status === 'error' ? job.error : null
  }

  const progressUpdate = () => jobToProgressUpdate(jobProgress())
  const canSubmit = (): boolean => {
    if (isProcessing()) return false
    const hasWriteAsset = state.llmEnabled || state.ttsWithLlm
    const hasMediaAsset = state.imageEnabled || state.videoEnabled || state.musicEnabled

    if (!hasWriteAsset && !hasMediaAsset) return false
    if (!state.writeModeSelected) return false
    if (!state.mediaDecisionSelected) return false
    if (state.ttsWithLlm && !state.llmEnabled && !data()?.hasTextOutput) return false
    if (state.llmEnabled && state.selectedPrompts.length === 0) return false
    if (state.llmEnabled && (!state.llmModelSelected || !state.llmService || !state.llmModel)) return false
    if (state.ttsWithLlm && (
      !state.ttsModelSelected ||
      !state.ttsVoiceSelected ||
      !state.ttsService ||
      !state.ttsModel ||
      !state.ttsVoice
    )) {
      return false
    }
    if (state.imageEnabled && (
      !state.imageModelSelected ||
      !state.imageDimensionSelected ||
      !state.imagePromptSelected ||
      !state.imageService ||
      !state.imageModel ||
      !state.imageDimensionOrRatio ||
      state.selectedImagePrompts.length === 0
    )) {
      return false
    }
    if (state.videoEnabled && (
      !state.videoModelSelected ||
      !state.videoSizeSelected ||
      !state.videoDurationSelected ||
      (requiresExplicitVideoAspectRatioSelection(state.videoService) && !state.videoAspectRatioSelected) ||
      !state.videoPromptSelected ||
      !state.videoService ||
      !state.videoModel ||
      !state.videoSize ||
      !state.videoDuration ||
      !state.videoAspectRatio ||
      state.selectedVideoPrompts.length === 0
    )) {
      return false
    }
    if (state.musicEnabled && (
      !state.musicModelSelected ||
      !state.musicGenreSelected ||
      !state.musicPresetSelected ||
      !state.musicDurationSelected ||
      !state.musicService ||
      !state.musicModel ||
      !state.selectedMusicGenre ||
      !state.musicPreset ||
      !state.musicDurationSeconds
    )) {
      return false
    }
    return true
  }

  return (
    <div class={clsx(ui.page, ui.pagePadded)}>
      <Title>Add Assets - AutoShow</Title>

      <div class={clsx(ui.container, s.innerContainer)}>
        <Show when={!isLoading()} fallback={
          <div class={s.loading}>
            <div class={clsx(ui.surface, ui.surfacePaddedLarge, s.skeleton)}>
              <div class={ui.skeletonTitle} />
              <div class={ui.skeletonLine} />
              <div class={ui.skeletonLineShort} />
            </div>
          </div>
        }>
          <Show
            when={data()}
            fallback={
              <main class={clsx(ui.surface, ui.surfacePaddedLarge, s.notFoundCard)}>
                <HttpStatusCode code={404} />
                <h1 class={s.notFoundTitle}>Show Note Not Found</h1>
                <p class={s.notFoundText}>
                  This show note is unavailable.
                </p>
                <A href="/show-notes" class={s.backLink}>
                  ← Back to dashboard
                </A>
              </main>
            }
          >
            {(route) => (
              <main class={clsx(ui.surface, ui.surfacePaddedLarge, s.article)}>
                <A href={`/show-notes/${route().note.id}`} class={s.backLink}>
                  ← Back to show note
                </A>

                <div class={clsx(createStyles.innerContainer, s.appendWizard)}>
                  <Show when={processingError()}>
                    <div class={clsx(ui.status, ui.statusDanger, createStyles.errorBox)}>
                      {processingError()}
                    </div>
                  </Show>

                  <Steps
                    state={state}
                    setState={setState}
                    isProcessing={isProcessing}
                    canSubmit={canSubmit}
                    submitAction={submitAppendAssets}
                    mode="append-assets"
                    appendShowNoteId={route().note.id}
                  />

                  <Show when={submission.pending}>
                    <div class={createStyles.form}>
                      <p>Starting asset generation...</p>
                    </div>
                  </Show>

                  <Show when={isProcessing() && !submission.pending && progressUpdate()}>
                    <ProgressTracker progress={progressUpdate()!} />
                  </Show>
                </div>
              </main>
            )}
          </Show>
        </Show>
      </div>
    </div>
  )
}

import { Title } from "@solidjs/meta"
import { Show, createSignal, createEffect, onCleanup, onMount } from "solid-js"
import { A, useNavigate, useSearchParams, action, useSubmission } from "@solidjs/router"
import { createStore } from "solid-js/store"
import type { ProgressUpdate, Job, StepsState } from "~/types"
import { err } from "~/utils/logging"
import { getDefaultImageModelForService, getDefaultMusicGenre, getDefaultMusicModelForService, getDefaultMusicService, getDefaultTranscriptionModelForService, getDefaultTTSModel, getDefaultVideoModel } from "~/models"
import { savePendingJob, getPendingJob, clearPendingJob } from "~/routes/api/jobs/pending-job"
import Steps from "./StepsComponents/Steps"
import ProgressTracker from "./ProgressComponents/ProgressTracker"
import s from "./create.module.css"

const DEFAULT_MUSIC_SERVICE = getDefaultMusicService()
const DEFAULT_MUSIC_GENRE = getDefaultMusicGenre(DEFAULT_MUSIC_SERVICE)
const DEFAULT_MUSIC_MODEL = getDefaultMusicModelForService(DEFAULT_MUSIC_SERVICE)
const DEFAULT_LLM_SERVICE = "groq"
const DEFAULT_LLM_MODEL = "openai/gpt-oss-20b"

const submitShowNote = action(async (formData: FormData) => {
  const response = await fetch('/api/process', {
    method: 'POST',
    body: formData
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to start processing')
  }
  const { jobId } = await response.json()
  return { jobId }
}, "submitShowNote")

function jobToProgressUpdate(job: Job | null): ProgressUpdate | null {
  if (!job) return null
  return {
    step: job.currentStep,
    stepName: job.stepName || '',
    stepProgress: job.stepProgress,
    overallProgress: job.overallProgress,
    status: job.status === 'error' ? 'error' : 
            job.status === 'completed' ? 'completed' : 'processing',
    message: job.message || '',
    error: job.error || undefined,
    showNoteId: job.showNoteId || undefined
  }
}

export default function Create() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const submission = useSubmission(submitShowNote)
  
  const [jobProgress, setJobProgress] = createSignal<Job | null>(null)
  
  const [state, setState] = createStore({
    transcriptionOption: "groq",
    transcriptionModel: getDefaultTranscriptionModelForService("groq"),
    selectedPrompts: ["shortSummary"],
    llmService: DEFAULT_LLM_SERVICE,
    llmModel: DEFAULT_LLM_MODEL,
    ttsSkipped: true,
    ttsService: "openai",
    ttsVoice: "coral",
    ttsModel: getDefaultTTSModel("openai"),
    imageGenSkipped: true,
    imageService: "openai",
    imageModel: getDefaultImageModelForService("openai"),
    imageDimensionOrRatio: "1024x1024",
    selectedImagePrompts: ["keyMoment"],
    musicGenSkipped: true,
    musicService: DEFAULT_MUSIC_SERVICE,
    musicModel: DEFAULT_MUSIC_MODEL,
    selectedMusicGenre: DEFAULT_MUSIC_GENRE,
    musicPreset: "cheap",
    musicDurationSeconds: 60,
    musicInstrumental: false,
    musicSampleRate: undefined,
    musicBitrate: undefined,
    videoGenSkipped: true,
    videoService: "openai",
    selectedVideoPrompts: ["explainer"],
    videoModel: getDefaultVideoModel("openai"),
    videoSize: "1280x720",
    videoDuration: 8,
    videoAspectRatio: "16:9",
    selectedFile: null,
    uploadedFilePath: "",
    uploadedFileName: "",
    uploadedFileDuration: undefined,
    isUploading: false,
    uploadError: "",
    uploadProgress: 0,
    urlValue: "",
    isVerifying: false,
    urlMetadata: null,
    urlVerified: false,
    documentService: "llamaparse",
    documentModel: "cost_effective"
  } as StepsState)

  async function fetchJobProgress(jobId: string) {
    try {
      const response = await fetch(`/api/jobs/${jobId}`)
      if (!response.ok) {
        clearPendingJob()
        setSearchParams({ job: undefined }, { replace: true })
        return
      }
      const job: Job = await response.json()
      setJobProgress(job)
      if (job.status === 'completed' && job.showNoteId) {
        clearPendingJob()
        navigate(`/show-notes/${job.showNoteId}`)
      } else if (job.status === 'error') {
        clearPendingJob()
      }
    } catch (error) {
      err('Failed to fetch job progress', error)
    }
  }

  onMount(async () => {
    const jobIdFromUrl = searchParams.job
    if (!jobIdFromUrl) {
      const pendingJobId = getPendingJob()
      if (pendingJobId) {
        try {
          const response = await fetch(`/api/jobs/${pendingJobId}`)
          if (response.ok) {
            const job: Job = await response.json()
            if (job.status === 'pending' || job.status === 'processing') {
              setSearchParams({ job: pendingJobId }, { replace: true })
              return
            }
          }
        } catch {
        }
        clearPendingJob()
      }
    }
  })

  createEffect(() => {
    const result = submission.result
    if (result?.jobId && searchParams.job !== result.jobId) {
      savePendingJob(result.jobId)
      setSearchParams({ job: result.jobId }, { replace: true })
    }
  })

  createEffect(() => {
    const jobIdParam = searchParams.job
    const jobId = typeof jobIdParam === 'string' ? jobIdParam : undefined
    if (!jobId) return
    fetchJobProgress(jobId)
    const interval = setInterval(() => fetchJobProgress(jobId), 1000)
    onCleanup(() => clearInterval(interval))
  })

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
    if (state.isUploading || state.isVerifying || isProcessing()) {
      return false
    }
    if (state.selectedPrompts.length === 0) {
      return false
    }
    if (!state.imageGenSkipped && state.selectedImagePrompts.length === 0) {
      return false
    }
    if (!state.videoGenSkipped && state.selectedVideoPrompts.length === 0) {
      return false
    }
    const hasFile = !!state.uploadedFilePath && !!state.selectedFile
    const hasUrl = state.urlVerified && !!state.urlMetadata && !state.urlMetadata.error
    return hasFile || hasUrl
  }

  return (
    <div class={s.container}>
      <Title>Create Show Note - AutoShow</Title>
      
      <div class={s.innerContainer}>
        <header class={s.header}>
          <A href="/" class={s.backLink}>
            ← Back to home
          </A>
          <h1 class={s.title}>
            AutoShow
          </h1>
        </header>

        <Show when={processingError()}>
          <div class={s.errorBox}>
            {processingError()}
          </div>
        </Show>

        <Show when={state.uploadError}>
          <div class={s.errorBox}>
            {state.uploadError}
          </div>
        </Show>

        <Steps
          state={state}
          setState={setState}
          isProcessing={isProcessing}
          canSubmit={canSubmit}
          submitAction={submitShowNote}
        />

        <Show when={submission.pending}>
          <div class={s.form}>
            <p>Starting processing...</p>
          </div>
        </Show>

        <Show when={isProcessing() && !submission.pending && progressUpdate()}>
          <ProgressTracker progress={progressUpdate()!} />
        </Show>
      </div>
    </div>
  )
}

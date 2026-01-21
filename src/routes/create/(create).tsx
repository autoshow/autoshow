import { Title } from "@solidjs/meta"
import { Show, createSignal, createEffect, onCleanup, onMount } from "solid-js"
import { A, useNavigate, useSearchParams, action, useSubmission } from "@solidjs/router"
import { createStore } from "solid-js/store"
import { getDefaultWhisperModel } from "~/utils/services"
import Steps from "./StepsComponents/Steps"
import ProgressTracker from "./ProgressComponents/ProgressTracker"
import type { ProgressUpdate, Job } from "~/types/main"
import { savePendingJob, getPendingJob, clearPendingJob } from "~/routes/api/jobs/pending-job"
import { l, err } from "../../utils/logging"
import s from "./create.module.css"

const CHUNK_SIZE = 5 * 1024 * 1024

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
    transcriptionModel: "whisper-large-v3-turbo",
    selectedPrompts: ["shortSummary", "longSummary"],
    llmService: "openai" as "openai" | "anthropic" | "gemini",
    llmModel: "gpt-5-nano",
    ttsSkipped: false,
    ttsService: "openai",
    ttsVoice: "coral",
    imageGenSkipped: false,
    selectedImagePrompts: ["keyMoment"] as string[],
    musicGenSkipped: false,
    selectedMusicGenre: "pop",
    videoGenSkipped: false,
    selectedVideoPrompts: ["explainer"] as string[],
    videoModel: "sora-2",
    videoSize: "1280x720",
    videoDuration: 8,
    selectedFile: null as File | null,
    uploadedFilePath: "",
    uploadedFileName: "",
    isUploading: false,
    uploadError: "",
    uploadProgress: 0,
    urlValue: "",
    isVerifying: false,
    urlMetadata: null as any,
    urlVerified: false
  })

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
    const jobId = searchParams.job as string | undefined
    if (!jobId) return
    
    fetchJobProgress(jobId)
    
    const interval = setInterval(() => fetchJobProgress(jobId), 1000)
    
    onCleanup(() => clearInterval(interval))
  })

  const finalizeFileSource = (filePath: string, fileName: string) => {
    setState({
      uploadedFilePath: filePath,
      uploadedFileName: fileName,
      uploadProgress: 100,
      urlValue: "",
      urlMetadata: null,
      urlVerified: false,
      transcriptionOption: "groq",
      transcriptionModel: getDefaultWhisperModel()
    })
  }

  const finalizeUrlSource = (metadata: any) => {
    const needsWhisper = metadata.urlType === "direct-file"
    setState({
      urlMetadata: metadata,
      urlVerified: true,
      selectedFile: null,
      uploadedFilePath: "",
      uploadedFileName: "",
      transcriptionOption: needsWhisper ? "groq" : "happyscribe",
      transcriptionModel: needsWhisper ? getDefaultWhisperModel() : state.transcriptionModel
    })
  }

  const uploadFileChunked = async (file: File): Promise<void> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const fileId = `${Date.now()}_${Math.random().toString(36).slice(2)}`
    
    setState("uploadProgress", 0)
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)
      
      const formData = new FormData()
      formData.append("chunk", chunk)
      formData.append("chunkIndex", i.toString())
      formData.append("totalChunks", totalChunks.toString())
      formData.append("fileId", fileId)
      formData.append("fileName", file.name)
      
      const response = await fetch("/api/upload-chunk", {
        method: "POST",
        body: formData
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Chunk upload failed")
      }
      
      const progress = ((i + 1) / totalChunks) * 100
      setState("uploadProgress", progress)
      
      if (result.complete) {
        finalizeFileSource(result.filePath, result.fileName)
        return
      }
    }
  }

  const uploadFileSimple = async (file: File): Promise<void> => {
    const formData = new FormData()
    formData.append("file", file)
    
    const xhr = new XMLHttpRequest()
    
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100
        setState("uploadProgress", progress)
      }
    })
    
    const uploadPromise = new Promise<void>((resolve, reject) => {
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText)
          finalizeFileSource(result.filePath, result.fileName)
          resolve()
        } else {
          reject(new Error("Upload failed"))
        }
      })
      
      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"))
      })
      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"))
      })
      
      xhr.open("POST", "/api/upload")
      xhr.send(formData)
    })
    
    await uploadPromise
  }

  const handleFileChange = async (file: File | null): Promise<void> => {
    if (!file) return
    
    setState("isUploading", true)
    setState("uploadError", "")
    setState("uploadedFilePath", "")
    setState("uploadedFileName", "")
    setState("uploadProgress", 0)
    
    try {
      if (file.size > 100 * 1024 * 1024) {
        await uploadFileChunked(file)
      } else {
        await uploadFileSimple(file)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file"
      setState("uploadError", errorMessage)
      setState("selectedFile", null)
      setState("uploadProgress", 0)
      err('File upload failed', error)
    } finally {
      setState("isUploading", false)
    }
  }

  const handleVerifyUrl = async (): Promise<void> => {
    if (!state.urlValue || state.isVerifying) return
    
    setState("isVerifying", true)
    setState("urlMetadata", null)
    setState("urlVerified", false)

    try {
      const response = await fetch("/api/verify-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: state.urlValue })
      })

      const result = await response.json()

      if (result.error) {
        setState("urlMetadata", result)
        setState("urlVerified", false)
        l(`URL verification failed: ${result.error}`)
      } else {
        finalizeUrlSource(result)
      }
    } catch (error) {
      err('URL verification error', error)
      setState("urlMetadata", { error: "Failed to verify URL" })
      setState("urlVerified", false)
    } finally {
      setState("isVerifying", false)
    }
  }

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
          handleFileChange={handleFileChange}
          handleVerifyUrl={handleVerifyUrl}
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

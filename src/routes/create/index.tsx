import clsx from "clsx"
import { Title } from "@solidjs/meta"
import { action,createAsync,useNavigate,useSearchParams,useSubmission,type RouteDefinition } from "@solidjs/router"
import { Show,createEffect,createMemo,createSignal,on,onCleanup,onMount } from "solid-js"
import { createStore } from "solid-js/store"
import {
DOCUMENT_CONFIG,
getAvailableDocumentModels,
getDefaultDocumentModel,
getDefaultDocumentService,
getDocumentTypeFromExtension,
requiresExplicitVideoAspectRatioSelection,
resolveDocumentRuntimeCapabilities
} from "~/models"
import { getCreateRouteData } from "~/routes/presets/preset-data"
import {
applyPresetConfigToState,
getPresetCompatibilityKeyForSource,
} from "~/routes/presets/presets"
import ui from "~/styles/ui.module.css"
import type {
DocumentExtractionServiceType,
DocumentRuntimeCapabilities,
Job,
PresetCompatibilityKey,
PresetRecord,
StepsState,
SupportedDocumentType,
} from "~/types"
import { createInitialStepsState } from "./create-state"
import s from "./create.module.css"
import { jobToProgressUpdate } from "./progress-update"
import ProgressTracker from "./ProgressComponents/ProgressTracker"
import Steps from "./StepsComponents/Steps"
import { isSourceReady } from "./StepsComponents/shared/source-readiness"

const STORAGE_KEY = 'autoshow-pending-job'

function savePendingJob(jobId: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, jobId)
  }
}

function getPendingJob(): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY)
  }
  return null
}

function clearPendingJob(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

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

type SubmitShowNoteResult = { jobId: string }

export const route: RouteDefinition = {
  preload: () => getCreateRouteData()
}

export default function Create() {
  const routeData = createAsync(() => getCreateRouteData())
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const submission = useSubmission(submitShowNote)

  const [jobProgress, setJobProgress] = createSignal<Job | null>(null)

  const [state, setState] = createStore(createInitialStepsState())
  const [selectedPresetId, setSelectedPresetId] = createSignal<string | null>(null)

  const isDocumentServiceType = (value: string): value is DocumentExtractionServiceType => {
    return value in DOCUMENT_CONFIG
  }

  const getDocumentTypeForState = (sourceState: StepsState): SupportedDocumentType | null => {
    if (sourceState.urlMetadata?.urlType === "document") {
      return sourceState.urlMetadata.documentType ?? null
    }

    if (sourceState.uploadedFileName) {
      return getDocumentTypeFromExtension(sourceState.uploadedFileName)
    }

    return null
  }

  const getCurrentDocumentType = (): SupportedDocumentType | null => getDocumentTypeForState(state)
  const documentRuntimeCapabilities = (): DocumentRuntimeCapabilities | null => {
    return routeData()?.documentRuntimeCapabilities ?? null
  }

  const getDocumentSelectionUpdate = (
    documentType: SupportedDocumentType | null,
    capabilities: DocumentRuntimeCapabilities | null,
    documentService: string,
    documentModel: string
  ): { documentService: DocumentExtractionServiceType; documentModel: string; documentModelSelected: false } | null => {
    if (!documentType) return null

    const runtimeCapabilities = resolveDocumentRuntimeCapabilities(capabilities)
    const currentModels = isDocumentServiceType(documentService)
      ? getAvailableDocumentModels(documentService, documentType, runtimeCapabilities)
      : []

    if (currentModels.some(model => model === documentModel)) {
      return null
    }

    const nextService = getDefaultDocumentService(documentType, runtimeCapabilities)
    const nextModel = getDefaultDocumentModel(nextService, documentType, runtimeCapabilities)

    return {
      documentService: nextService,
      documentModel: nextModel,
      documentModelSelected: false
    }
  }

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
    } catch {
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

  const submissionResult = (): SubmitShowNoteResult | undefined => submission.result as SubmitShowNoteResult | undefined
  const submittedJobId = (): string | undefined => submissionResult()?.jobId
  const activeJobId = (): string | undefined => {
    const jobIdParam = searchParams.job
    return typeof jobIdParam === 'string' ? jobIdParam : undefined
  }

  createEffect(on(
    () => [submittedJobId(), activeJobId()] as const,
    ([jobId, currentJobId]) => {
      if (jobId && currentJobId !== jobId) {
        savePendingJob(jobId)
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

  const sourceReady = (): boolean => {
    return isSourceReady(state)
  }

  const canSubmit = (): boolean => {
    if (state.isUploading || state.isVerifying || isProcessing()) {
      return false
    }
    if (currentDocumentType()) {
      if (!state.documentModelSelected || !state.documentService || !state.documentModel) {
        return false
      }
    } else if (!state.transcriptionModelSelected || !state.transcriptionOption || !state.transcriptionModel) {
      return false
    }
    if (!state.writeModeSelected) {
      return false
    }
    if (state.llmEnabled && state.selectedPrompts.length === 0) {
      return false
    }
    if (state.llmEnabled && (!state.llmModelSelected || !state.llmService || !state.llmModel)) {
      return false
    }
    if (state.llmEnabled && state.ttsWithLlm && (
      !state.ttsModelSelected ||
      !state.ttsVoiceSelected ||
      !state.ttsService ||
      !state.ttsModel ||
      !state.ttsVoice
    )) {
      return false
    }
    if (!state.mediaDecisionSelected) {
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
    return sourceReady()
  }

  const currentDocumentType = createMemo(() => getCurrentDocumentType())

  const currentCompatibilityKey = createMemo((): PresetCompatibilityKey | null => getPresetCompatibilityKeyForSource({
    urlMetadata: state.urlMetadata,
    documentType: currentDocumentType(),
    ...(state.uploadId ? { uploadId: state.uploadId } : {}),
    ...(state.uploadedFileName ? { uploadedFileName: state.uploadedFileName } : {}),
  }))

  const compatiblePresets = createMemo(() => {
    const compatibilityKey = currentCompatibilityKey()
    if (!compatibilityKey) return []
    return (routeData()?.presets ?? []).filter((preset) => preset.compatibilityKey === compatibilityKey)
  })

  const activePreset = createMemo(() => {
    const selectedId = selectedPresetId()
    if (!selectedId) return null
    return compatiblePresets().find((preset) => preset.id === selectedId) ?? null
  })

  const applyPreset = (preset: PresetRecord): void => {
    const nextState = applyPresetConfigToState(state, preset.config)
    const selectionUpdate = getDocumentSelectionUpdate(
      getDocumentTypeForState(nextState),
      documentRuntimeCapabilities(),
      nextState.documentService,
      nextState.documentModel
    )

    setState({
      ...nextState,
      ...(selectionUpdate ?? {})
    })
    setSelectedPresetId(preset.id)
  }

  return (
    <div class={s.container}>
      <Title>Create Show Note - AutoShow</Title>

      <div class={s.innerContainer}>
        <Show when={processingError()}>
          <div class={clsx(ui.status, ui.statusDanger, s.errorBox)}>
            {processingError()}
          </div>
        </Show>

        <Show when={state.uploadError}>
          <div class={clsx(ui.status, ui.statusDanger, s.errorBox)}>
            {state.uploadError}
          </div>
        </Show>

        <Steps
          state={state}
          setState={setState}
          isProcessing={isProcessing}
          canSubmit={canSubmit}
          submitAction={submitShowNote}
          documentType={currentDocumentType()}
          documentRuntimeCapabilities={documentRuntimeCapabilities()}
          googleDriveImportConfigured={routeData()?.googleDriveImportConfigured ?? false}
          compatiblePresets={compatiblePresets()}
          activePresetId={activePreset()?.id ?? null}
          isLoadingPresets={!routeData()}
          presetError={null}
          onPresetApply={applyPreset}
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

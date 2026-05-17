import clsx from "clsx"
import { Show,createEffect,createMemo,createSignal,on,onCleanup } from "solid-js"
import {
findDocumentModel,
findImageModel,
findLLMModel,
findMusicModel,
findTTSModel,
findTranscriptionModel,
findVideoModel,
getImageServiceName,
getLLMServiceName,
getMusicServiceName,
getTTSServiceName,
getVideoServiceName
} from "~/models"
import { PROMPT_CONFIG } from "~/prompts/text-prompts/text-prompt-config"
import ui from "~/styles/ui.module.css"
import type { PreviewResponse,PromptType,SourceRoutesCreateStepsComponentsStep5WrapperReviewStepProps as Props } from '~/types'
import { formatUsdAsCents } from "~/utils/cost-helpers"
import { StepHeader } from "../shared"
import { serializeAppendAssetsRequest,serializeProcessingRequest } from "../shared/processing-request"
import s from "./ReviewStep.module.css"

function costLabel(n: number): string {
  return formatUsdAsCents(n)
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

type PreviewInput =
  | { mode: "preset" }
  | {
      mode: "job" | "append-assets"
      body: ReturnType<typeof serializeProcessingRequest>
      endpoint: string
    }

export default function ReviewStep(props: Props) {
  const [previewData, setPreviewData] = createSignal<PreviewResponse | null>(null)
  const [isLoading, setIsLoading] = createSignal(false)
  const [fetchError, setFetchError] = createSignal<string | null>(null)
  const isPresetMode = () => (props.mode ?? 'job') === 'preset'
  const isAppendMode = () => props.mode === 'append-assets'
  let previewRequestId = 0

  const previewInput = createMemo((): PreviewInput => {
    if (isPresetMode()) {
      return { mode: "preset" }
    }

    if (isAppendMode()) {
      return {
        mode: "append-assets",
        body: serializeAppendAssetsRequest(props.state),
        endpoint: props.appendShowNoteId
          ? `/api/show-notes/${props.appendShowNoteId}/assets/preview`
          : '',
      }
    }

    return {
      mode: "job",
      body: serializeProcessingRequest(props.state, props.documentType ?? null),
      endpoint: '/api/process/preview',
    }
  })

  const fetchPreview = async (input: PreviewInput = previewInput()) => {
    const requestId = ++previewRequestId

    if (input.mode === "preset") {
      setPreviewData(null)
      setFetchError(null)
      setIsLoading(false)
      props.onPreviewReady(true)
      return
    }

    setIsLoading(true)
    setFetchError(null)
    props.onPreviewReady(false)

    try {
      if (!input.endpoint) {
        setFetchError('Preview failed')
        return
      }

      const resp = await fetch(input.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input.body),
      })
      if (requestId !== previewRequestId) return

      if (!resp.ok) {
        const errData = await resp.json()
        setFetchError(errData.error || 'Preview failed')
        return
      }
      const data: PreviewResponse = await resp.json()
      setPreviewData(data)
      props.onPreviewReady(true)
    } catch {
      if (requestId !== previewRequestId) return
      setFetchError('Network error — could not load preview')
    } finally {
      if (requestId === previewRequestId) {
        setIsLoading(false)
      }
    }
  }

  createEffect(on(previewInput, (input) => {
    void fetchPreview(input)
  }))

  onCleanup(() => {
    previewRequestId += 1
  })

  const state = () => props.state

  const sourceSummary = createMemo(() => {
    if (state().urlVerified && state().urlMetadata && !state().urlMetadata?.error) {
      const meta = state().urlMetadata!
      const type = meta.urlType === 'youtube'
        ? 'YouTube'
        : meta.urlType === 'streaming'
        ? 'Streaming'
        : meta.urlType === 'direct-file'
        ? 'Direct File'
        : meta.urlType === 'document'
        ? `Document (${meta.documentType?.toUpperCase() ?? ''})`
        : meta.urlType
      const parts = [type]
      if (meta.durationFormatted) parts.push(meta.durationFormatted)
      if (meta.fileSizeFormatted) parts.push(meta.fileSizeFormatted)
      return { label: state().urlValue, detail: parts.join(' · ') }
    }
    if (state().uploadId && state().uploadedFileName) {
      const detailParts = [state().sourceOrigin === 'google-drive' ? 'Google Drive import' : 'Uploaded file']
      const uploadedFileSize = state().uploadedFileSize
      if (uploadedFileSize !== undefined) detailParts.push(formatBytes(uploadedFileSize))
      return { label: state().uploadedFileName, detail: detailParts.join(' · ') }
    }
    return null
  })
  const sourceInputLabel = () => sourceSummary()?.label
  const sourceInputDetail = () => sourceSummary()?.detail
  const previewBreakdown = () => previewData()?.breakdown
  const hasPreviewContent = () => !isLoading() && (isPresetMode() || !!previewData())

  const transcriptionModelName = () => {
    const m = findTranscriptionModel(
      state().transcriptionOption as Parameters<typeof findTranscriptionModel>[0],
      state().transcriptionModel
    )
    return m?.name ?? state().transcriptionModel
  }

  const llmModelName = () => {
    const m = findLLMModel(state().llmService as Parameters<typeof findLLMModel>[0], state().llmModel)
    return m?.name ?? state().llmModel
  }

  const ttsModelName = () => {
    const m = findTTSModel(state().ttsService as Parameters<typeof findTTSModel>[0], state().ttsModel)
    return m?.name ?? state().ttsModel
  }

  const imageModelName = () => {
    const m = findImageModel(state().imageService as Parameters<typeof findImageModel>[0], state().imageModel)
    return m?.name ?? state().imageModel
  }

  const musicModelName = () => {
    const m = findMusicModel(state().musicService as Parameters<typeof findMusicModel>[0], state().musicModel)
    return m?.name ?? state().musicModel
  }

  const videoModelName = () => {
    const m = findVideoModel(state().videoService as Parameters<typeof findVideoModel>[0], state().videoModel)
    return m?.name ?? state().videoModel
  }

  const docModelName = () => {
    const ocrServices = ['mistral-ocr', 'glm', 'deapi'] as const
    for (const svc of ocrServices) {
      const m = findDocumentModel(svc, state().documentModel)
      if (m) return m.name
    }
    const m = findLLMModel(state().documentService as Parameters<typeof findLLMModel>[0], state().documentModel)
    return m?.name ?? state().documentModel
  }

  const promptTitles = () => {
    return state().selectedPrompts.map((prompt) => {
      return PROMPT_CONFIG[prompt as PromptType]?.title ?? prompt
    })
  }

  const writeModeLabel = () => {
    if (!state().llmEnabled && state().ttsWithLlm && isAppendMode()) return "TTS from latest text"
    if (!state().llmEnabled) return "Skipped"
    return state().ttsWithLlm ? "Write + TTS" : "Write"
  }

  const mediaSelectionLabel = () => {
    const enabled: string[] = []
    if (state().imageEnabled) enabled.push("Image")
    if (state().videoEnabled) enabled.push("Video")
    if (state().musicEnabled) enabled.push("Music")
    return enabled.length > 0 ? enabled.join(", ") : "Skipped"
  }

  const presetSourceConfigLabel = () => {
    switch (props.compatibilityKey) {
      case "document":
        return "Document"
      case "audio-file":
        return "Uploaded file or direct-file URL"
      case "audio-streaming":
        return "YouTube or streaming URL"
      default:
        return "Preset"
    }
  }

  return (
    <div class={s.container}>
      <StepHeader
        {...(props.stepNumber != null ? { stepNumber: props.stepNumber } : {})}
        title="Review"
        description={isPresetMode()
          ? "Review the preset settings before saving."
          : isAppendMode()
          ? "Review the selected assets and estimated cost before appending them."
          : "Review your source, selected settings, and estimated cost before starting the job."}
      />

      <Show when={isLoading()}>
        <div class={s.loadingState} role="status" aria-live="polite" aria-busy="true">
          <span class={s.loadingSpinner} aria-hidden="true" />
          <span>Loading review...</span>
        </div>
      </Show>

      <Show when={fetchError() && !isLoading()}>
        <div class={clsx(ui.status, ui.statusDanger, s.errorBox)}>
          <p>{fetchError()}</p>
          <button
            type="button"
            onClick={() => void fetchPreview()}
            class={clsx(ui.action, ui.actionDanger, ui.actionLift, s.retryButton)}
          >
            Retry
          </button>
        </div>
      </Show>

      <Show when={hasPreviewContent()}>
        <>
              {/* Source */}
              <Show when={!isPresetMode() && !isAppendMode()}>
                <section class={s.section}>
                  <h3 class={s.sectionTitle}>Source</h3>
                  <Show when={sourceInputLabel()}>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Input</span>
                      <span class={s.summaryValue}>{sourceInputLabel()}</span>
                    </div>
                  </Show>
                  <Show when={sourceInputDetail()}>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Details</span>
                      <span class={s.summaryValue}>{sourceInputDetail()}</span>
                    </div>
                  </Show>
                </section>
              </Show>

              {/* Transcription / Document */}
              <Show when={!isAppendMode()}>
                <section class={s.section}>
                  <h3 class={s.sectionTitle}>
                    {props.documentType || props.compatibilityKey === "document" ? "Document Extraction" : "Transcription"}
                  </h3>
                  <Show when={isPresetMode()}>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Compatibility</span>
                      <span class={s.summaryValue}>{presetSourceConfigLabel()}</span>
                    </div>
                  </Show>
                  <Show when={!props.documentType && props.compatibilityKey !== "document"}>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Service</span>
                      <span class={s.summaryValue}>{state().transcriptionOption}</span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Model</span>
                      <span class={s.summaryValue}>{transcriptionModelName()}</span>
                    </div>
                  </Show>
                  <Show when={props.documentType || props.compatibilityKey === "document"}>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Service</span>
                      <span class={s.summaryValue}>{state().documentService}</span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Model</span>
                      <span class={s.summaryValue}>{docModelName()}</span>
                    </div>
                  </Show>
                </section>
              </Show>

              <section class={s.section}>
                <h3 class={s.sectionTitle}>Write and TTS</h3>
                <div class={s.summaryRow}>
                  <span class={s.summaryLabel}>Mode</span>
                  <span class={s.summaryValue}>{writeModeLabel()}</span>
                </div>
                <Show when={state().llmEnabled}>
                  <>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>LLM Service</span>
                      <span class={s.summaryValue}>
                        {getLLMServiceName(state().llmService as Parameters<typeof getLLMServiceName>[0])}
                      </span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>LLM Model</span>
                      <span class={s.summaryValue}>{llmModelName()}</span>
                    </div>
                    <Show when={promptTitles().length > 0}>
                      <div class={s.summaryRow}>
                        <span class={s.summaryLabel}>Prompts</span>
                        <span class={s.summaryValue}>{promptTitles().join(', ')}</span>
                      </div>
                    </Show>
                    <Show when={state().llmCustomInstructions.trim().length > 0}>
                      <div class={s.summaryRow}>
                        <span class={s.summaryLabel}>Instructions</span>
                        <span class={s.summaryValue}>{state().llmCustomInstructions}</span>
                      </div>
                    </Show>
                  </>
                </Show>
                <Show when={state().ttsWithLlm}>
                  <>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>TTS Service</span>
                      <span class={s.summaryValue}>
                        {getTTSServiceName(state().ttsService as Parameters<typeof getTTSServiceName>[0])}
                      </span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>TTS Model</span>
                      <span class={s.summaryValue}>{ttsModelName()}</span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Voice</span>
                      <span class={s.summaryValue}>{state().ttsVoice}</span>
                    </div>
                  </>
                </Show>
              </section>

              <section class={s.section}>
                <h3 class={s.sectionTitle}>Image, Video, and Music</h3>
                <div class={s.summaryRow}>
                  <span class={s.summaryLabel}>Enabled</span>
                  <span class={s.summaryValue}>{mediaSelectionLabel()}</span>
                </div>

                <Show when={state().imageEnabled}>
                  <>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Image Service</span>
                      <span class={s.summaryValue}>
                        {getImageServiceName(state().imageService as Parameters<typeof getImageServiceName>[0])}
                      </span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Image Model</span>
                      <span class={s.summaryValue}>{imageModelName()}</span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Image Size</span>
                      <span class={s.summaryValue}>{state().imageDimensionOrRatio}</span>
                    </div>
                    <Show when={state().selectedImagePrompts.length > 0}>
                      <div class={s.summaryRow}>
                        <span class={s.summaryLabel}>Image Prompt</span>
                        <span class={s.summaryValue}>{state().selectedImagePrompts.join(', ')}</span>
                      </div>
                    </Show>
                  </>
                </Show>

                <Show when={state().videoEnabled}>
                  <>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Video Service</span>
                      <span class={s.summaryValue}>
                        {getVideoServiceName(state().videoService as Parameters<typeof getVideoServiceName>[0])}
                      </span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Video Model</span>
                      <span class={s.summaryValue}>{videoModelName()}</span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Video Size</span>
                      <span class={s.summaryValue}>{state().videoSize}</span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Video Duration</span>
                      <span class={s.summaryValue}>{state().videoDuration}s</span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Aspect Ratio</span>
                      <span class={s.summaryValue}>{state().videoAspectRatio}</span>
                    </div>
                    <Show when={state().selectedVideoPrompts.length > 0}>
                      <div class={s.summaryRow}>
                        <span class={s.summaryLabel}>Video Prompt</span>
                        <span class={s.summaryValue}>{state().selectedVideoPrompts.join(', ')}</span>
                      </div>
                    </Show>
                  </>
                </Show>

                <Show when={state().musicEnabled}>
                  <>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Music Service</span>
                      <span class={s.summaryValue}>
                        {getMusicServiceName(state().musicService as Parameters<typeof getMusicServiceName>[0])}
                      </span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Music Model</span>
                      <span class={s.summaryValue}>{musicModelName()}</span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Genre</span>
                      <span class={s.summaryValue}>{state().selectedMusicGenre}</span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Preset</span>
                      <span class={s.summaryValue}>{state().musicPreset}</span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Duration</span>
                      <span class={s.summaryValue}>{state().musicDurationSeconds}s</span>
                    </div>
                    <div class={s.summaryRow}>
                      <span class={s.summaryLabel}>Instrumental</span>
                      <span class={s.summaryValue}>{state().musicInstrumental ? "Yes" : "No"}</span>
                    </div>
                  </>
                </Show>
              </section>

              {/* Cost estimate */}
              <Show when={!isPresetMode() && previewData()}>
                <section class={s.section}>
                  <h3 class={s.sectionTitle}>Estimated Cost</h3>
                <Show when={(previewBreakdown()?.transcription ?? 0) > 0}>
                  <div class={s.summaryRow}>
                    <span class={s.summaryLabel}>Transcription</span>
                    <span class={s.summaryValue}>{costLabel(previewBreakdown()?.transcription ?? 0)}</span>
                  </div>
                </Show>
                <Show when={(previewBreakdown()?.document ?? 0) > 0}>
                  <div class={s.summaryRow}>
                    <span class={s.summaryLabel}>Document</span>
                    <span class={s.summaryValue}>{costLabel(previewBreakdown()?.document ?? 0)}</span>
                  </div>
                </Show>
                <Show when={(previewBreakdown()?.llm ?? 0) > 0}>
                  <div class={s.summaryRow}>
                    <span class={s.summaryLabel}>LLM</span>
                    <span class={s.summaryValue}>{costLabel(previewBreakdown()?.llm ?? 0)}</span>
                  </div>
                </Show>
                <Show when={(previewBreakdown()?.tts ?? 0) > 0}>
                  <div class={s.summaryRow}>
                    <span class={s.summaryLabel}>TTS</span>
                    <span class={s.summaryValue}>{costLabel(previewBreakdown()?.tts ?? 0)}</span>
                  </div>
                </Show>
                <Show when={(previewBreakdown()?.image ?? 0) > 0}>
                  <div class={s.summaryRow}>
                    <span class={s.summaryLabel}>Image</span>
                    <span class={s.summaryValue}>{costLabel(previewBreakdown()?.image ?? 0)}</span>
                  </div>
                </Show>
                <Show when={(previewBreakdown()?.music ?? 0) > 0}>
                  <div class={s.summaryRow}>
                    <span class={s.summaryLabel}>Music</span>
                    <span class={s.summaryValue}>{costLabel(previewBreakdown()?.music ?? 0)}</span>
                  </div>
                </Show>
                <Show when={(previewBreakdown()?.video ?? 0) > 0}>
                  <div class={s.summaryRow}>
                    <span class={s.summaryLabel}>Video</span>
                    <span class={s.summaryValue}>{costLabel(previewBreakdown()?.video ?? 0)}</span>
                  </div>
                </Show>
                <div class={s.summaryRowTotal}>
                  <span class={s.summaryLabel}>Total</span>
                  <span class={s.summaryValue}>{costLabel(previewBreakdown()?.total ?? 0)}</span>
                </div>
              </section>
              </Show>

              <Show when={props.footerContent}>
                <section class={s.section}>
                  {props.footerContent}
                </section>
              </Show>
        </>
      </Show>
    </div>
  )
}

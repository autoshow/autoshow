import clsx from "clsx"
import { Show,createEffect,on,onCleanup } from "solid-js"
import {
getDefaultDocumentModel,
getDefaultDocumentService,
getDefaultTranscriptionModelForService,
resolveDocumentRuntimeCapabilities
} from "~/models"
import { getYouTubeCaptionSourceLabel } from "~/routes/api/process/01-dl-audio/video/youtube-captions"
import ui from "~/styles/ui.module.css"
import type { SourceRoutesCreateStepsComponentsStep1WrapperURLProps as Props,SourceRoutesCreateStepsComponentsStep1WrapperURLVerifyRequestState as VerifyRequestState,SourceRoutesCreateStepsComponentsStep1WrapperURLVerifyResponse as VerifyResponse } from '~/types'
import shared from "../shared/shared.module.css"
import s from "./URL.module.css"

export default function URL(props: Props) {
  let prefetchTimer: ReturnType<typeof setTimeout> | undefined
  let pendingVerifyRequest: VerifyRequestState | null = null

  const isPotentialYouTubeUrl = (value: string): boolean => {
    try {
      const url = new globalThis.URL(value)
      const hostname = url.hostname.toLowerCase()
      return hostname === "youtu.be" || hostname.endsWith(".youtu.be") || hostname.includes("youtube.com")
    } catch {
      return false
    }
  }

  const clearPrefetchTimer = (): void => {
    if (prefetchTimer) {
      clearTimeout(prefetchTimer)
      prefetchTimer = undefined
    }
  }

  const abortPendingVerifyRequest = (url?: string): void => {
    if (!pendingVerifyRequest) return
    if (url && pendingVerifyRequest.url !== url) return

    pendingVerifyRequest.controller.abort()
    pendingVerifyRequest = null
  }

  const fetchVerifyResponse = async (url: string, signal: AbortSignal): Promise<VerifyResponse> => {
    const response = await fetch("/api/download/verify-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url }),
      signal
    })

    return await response.json() as VerifyResponse
  }

  const startVerifyRequest = (url: string): VerifyRequestState => {
    if (pendingVerifyRequest?.url === url) {
      return pendingVerifyRequest
    }

    abortPendingVerifyRequest()

    const controller = new AbortController()
    const requestState: VerifyRequestState = {
      url,
      controller,
      promise: fetchVerifyResponse(url, controller.signal).then(result => {
        requestState.result = result
        return result
      })
    }

    pendingVerifyRequest = requestState
    return requestState
  }

  const applyVerifiedResult = (result: VerifyResponse): void => {
    if (result.error) {
      props.setState("urlMetadata", result)
      props.setState("urlVerified", false)
      return
    }

    const isDocument = result.urlType === "document"
    const needsWhisperSelection = result.urlType === "direct-file"
    const hasYouTubeCaptions = result.urlType === "youtube" && result.youtubeCaptions?.available === true
    const defaultStreamingService = hasYouTubeCaptions ? "youtube" : "happyscribe"

    if (isDocument) {
      const runtimeCapabilities = resolveDocumentRuntimeCapabilities(props.documentRuntimeCapabilities)
      const defaultService = getDefaultDocumentService(result.documentType, runtimeCapabilities)
      props.setState({
        urlMetadata: result,
        urlVerified: true,
        selectedFile: null,
        uploadId: "",
        uploadedFileName: "",
        uploadedFileSize: undefined,
        uploadedFileDuration: undefined,
        transcriptionOption: "",
        transcriptionModel: "",
        sourceOrigin: null,
        documentService: defaultService,
        documentModel: getDefaultDocumentModel(defaultService, result.documentType, runtimeCapabilities)
      })
      return
    }

    props.setState({
      urlMetadata: result,
      urlVerified: true,
      selectedFile: null,
      uploadId: "",
      uploadedFileName: "",
      uploadedFileSize: undefined,
      uploadedFileDuration: undefined,
      sourceOrigin: null,
      transcriptionOption: needsWhisperSelection ? "" : defaultStreamingService,
      transcriptionModel: needsWhisperSelection ? "" : getDefaultTranscriptionModelForService(defaultStreamingService)
    })
  }

  const youtubeCaptionLabel = (): string => {
    const captions = props.state.urlMetadata?.youtubeCaptions
    if (!captions?.available) return "Not detected"

    const language = captions.languageName
      ? `${captions.languageName} (${captions.language})`
      : captions.language
      ?? "Unknown language"

    return `${getYouTubeCaptionSourceLabel(captions.source)} · ${language}`
  }

  const handleVerifyUrl = async (): Promise<void> => {
    const currentUrl = props.state.urlValue.trim()
    if (!currentUrl || props.state.isVerifying) return

    props.setState("isVerifying", true)
    props.setState("urlMetadata", null)
    props.setState("urlVerified", false)

    try {
      const verifyRequest = startVerifyRequest(currentUrl)
      const result = verifyRequest.result ?? await verifyRequest.promise

      if (props.state.urlValue.trim() !== currentUrl) {
        return
      }

      applyVerifiedResult(result)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return
      }

      if (props.state.urlValue.trim() !== currentUrl) {
        return
      }

      props.setState("urlMetadata", { error: "Failed to verify URL" })
      props.setState("urlVerified", false)
    } finally {
      if (props.state.urlValue.trim() === currentUrl) {
        props.setState("isVerifying", false)
      }
    }
  }

  createEffect(on(
    () => ({
      currentUrl: props.state.urlValue.trim(),
      isDisabled: !!props.disabled,
      isVerifying: props.state.isVerifying,
    }),
    ({ currentUrl, isDisabled, isVerifying }) => {
      clearPrefetchTimer()

      if (!currentUrl || isDisabled || isVerifying || !isPotentialYouTubeUrl(currentUrl)) {
        return
      }

      prefetchTimer = setTimeout(() => {
        if (props.state.urlValue.trim() !== currentUrl || props.state.isVerifying) {
          return
        }

        const request = startVerifyRequest(currentUrl)
        void request.promise.catch(error => {
          if (error instanceof Error && error.name === "AbortError") {
            return
          }
        })
      }, 400)
    }
  ))

  onCleanup(() => {
    clearPrefetchTimer()
    abortPendingVerifyRequest()
  })

  return (
    <div class={clsx(shared.sourcePanel, s.sourcePanelUrl)}>
      <div>
        <label for="url" class={shared.label}>
          Video or Document URL
        </label>
        <div class={s.urlInputContainer}>
          <input
            id="url"
            name="url"
            type="url"
            value={props.state.urlValue}
            onInput={(e) => {
              const nextUrl = e.currentTarget.value
              props.setState("urlValue", nextUrl)
              props.setState("urlMetadata", null)
              props.setState("urlVerified", false)

              const normalizedNextUrl = nextUrl.trim()
              if (pendingVerifyRequest?.url !== normalizedNextUrl) {
                abortPendingVerifyRequest()
              }
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={props.disabled}
            class={s.input}
          />
          <button
            type="button"
            onClick={handleVerifyUrl}
            disabled={props.disabled || props.state.isVerifying || !props.state.urlValue}
            class={s.verifyButton}
          >
            {props.state.isVerifying ? "Verifying..." : "Verify"}
          </button>
        </div>

        <ul class={s.exampleList}>
          <li><span class={s.exampleName}>youtube.com/watch?v=...</span><span class={s.exampleDesc}>YouTube video or playlist</span></li>
          <li><span class={s.exampleName}>example.com/audio.mp3</span><span class={s.exampleDesc}>Direct link to audio or video</span></li>
          <li><span class={s.exampleName}>example.com/report.pdf</span><span class={s.exampleDesc}>Hosted PDF, Office, image, or text file</span></li>
        </ul>

        <Show when={props.state.urlMetadata}>
          <Show when={props.state.urlMetadata.error}>
            <div class={clsx(ui.statusCompact, ui.statusDanger, s.urlFeedback)}>
              {props.state.urlMetadata.error}
            </div>
          </Show>

          <Show when={!props.state.urlMetadata.error}>
            <div class={clsx(ui.status, ui.statusSuccess, s.urlFeedback)}>
              <div class={s.urlSuccessTitle}>
                ✓ URL Verified
              </div>
              <Show when={props.state.urlMetadata.thumbnail || props.state.urlMetadata.title || props.state.urlMetadata.author}>
                <div class={s.urlMediaSummary}>
                  <Show when={props.state.urlMetadata.thumbnail}>
                    {(thumbnail) => (
                      <img
                        src={thumbnail()}
                        alt={props.state.urlMetadata?.title || "Verified media thumbnail"}
                        class={s.urlThumbnail}
                      />
                    )}
                  </Show>
                  <div class={s.urlMediaText}>
                    <Show when={props.state.urlMetadata.title}>
                      {(title) => <div class={s.urlMediaTitle}>{title()}</div>}
                    </Show>
                    <Show when={props.state.urlMetadata.author}>
                      {(author) => (
                        <div class={s.urlMediaAuthor}>
                          <span class={s.urlInlineLabel}>Channel/Author:</span>{" "}
                          <Show
                            when={props.state.urlMetadata?.channelUrl}
                            fallback={<span>{author()}</span>}
                          >
                            {(channelUrl) => (
                              <a href={channelUrl()} target="_blank" rel="noopener noreferrer" class={s.urlMetadataLink}>
                                {author()}
                              </a>
                            )}
                          </Show>
                        </div>
                      )}
                    </Show>
                  </div>
                </div>
              </Show>
              <div class={s.urlMetadataGrid}>
                <div class={s.urlMetadataItem}>
                  <span class={s.urlMetadataLabel}>Type:</span>
                  <span class={s.urlMetadataValue}>
                    {props.state.urlMetadata.urlType === 'youtube' ? 'YouTube' :
                     props.state.urlMetadata.urlType === 'streaming' ? 'Streaming Platform' :
                     props.state.urlMetadata.urlType === 'direct-file' ? 'Direct File' :
                     props.state.urlMetadata.urlType === 'document' ? `Document (${props.state.urlMetadata.documentType?.toUpperCase() || 'PDF/PNG/JPG/TIFF/TXT/DOCX/PPTX/XLSX'})` : 'Unknown'}
                  </span>
                </div>
                <Show when={props.state.urlMetadata.publishDateFormatted || props.state.urlMetadata.publishDate}>
                  {(publishDate) => (
                    <div class={s.urlMetadataItem}>
                      <span class={s.urlMetadataLabel}>Video Published:</span>
                      <span class={s.urlMetadataValue}>{publishDate()}</span>
                    </div>
                  )}
                </Show>
                <Show when={props.state.urlMetadata.durationFormatted}>
                  <div class={s.urlMetadataItem}>
                    <span class={s.urlMetadataLabel}>Duration:</span>
                    <span class={s.urlMetadataValue}>{props.state.urlMetadata.durationFormatted}</span>
                  </div>
                </Show>
                <Show when={props.state.urlMetadata.fileSizeFormatted}>
                  <div class={s.urlMetadataItem}>
                    <span class={s.urlMetadataLabel}>Size:</span>
                    <span class={s.urlMetadataValue}>{props.state.urlMetadata.fileSizeFormatted}</span>
                  </div>
                </Show>
                <Show when={props.state.urlMetadata.mimeType}>
                  <div class={s.urlMetadataItem}>
                    <span class={s.urlMetadataLabel}>Format:</span>
                    <span class={s.urlMetadataValue}>{props.state.urlMetadata.mimeType}</span>
                  </div>
                </Show>
                <Show when={props.state.urlMetadata.urlType === 'youtube' && props.state.urlMetadata.youtubeCaptions}>
                  <div class={s.urlMetadataItem}>
                    <span class={s.urlMetadataLabel}>Captions:</span>
                    <span class={s.urlMetadataValue}>{youtubeCaptionLabel()}</span>
                  </div>
                </Show>
              </div>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  )
}

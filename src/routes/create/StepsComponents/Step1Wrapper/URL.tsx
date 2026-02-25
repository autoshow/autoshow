import { Show } from "solid-js"
import type { StepsProps } from "~/types"
import { getDefaultTranscriptionModelForService, getDefaultDocumentModel, getDefaultDocumentService } from "~/models"
import { err, l } from "~/utils/logging"
import shared from "../shared/shared.module.css"
import s from "./URL.module.css"

type Props = {
  state: StepsProps['state']
  setState: StepsProps['setState']
  disabled: boolean | undefined
}

export default function URL(props: Props) {
  const handleVerifyUrl = async (): Promise<void> => {
    if (!props.state.urlValue || props.state.isVerifying) return
    props.setState("isVerifying", true)
    props.setState("urlMetadata", null)
    props.setState("urlVerified", false)
    try {
      const response = await fetch("/api/download/verify-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: props.state.urlValue })
      })
      const result = await response.json()
      if (result.error) {
        props.setState("urlMetadata", result)
        props.setState("urlVerified", false)
        l(`URL verification failed: ${result.error}`)
      } else {
        const isDocument = result.urlType === "document"
        const needsWhisper = result.urlType === "direct-file"
        
        if (isDocument) {
          const defaultService = getDefaultDocumentService()
          props.setState({
            urlMetadata: result,
            urlVerified: true,
            selectedFile: null,
            uploadedFilePath: "",
            uploadedFileName: "",
            transcriptionOption: "groq",
            transcriptionModel: getDefaultTranscriptionModelForService("groq"),
            documentService: defaultService,
            documentModel: getDefaultDocumentModel(defaultService)
          })
        } else {
          props.setState({
            urlMetadata: result,
            urlVerified: true,
            selectedFile: null,
            uploadedFilePath: "",
            uploadedFileName: "",
            transcriptionOption: needsWhisper ? "groq" : "happyscribe",
            transcriptionModel: needsWhisper ? getDefaultTranscriptionModelForService("groq") : getDefaultTranscriptionModelForService("happyscribe")
          })
        }
      }
    } catch (error) {
      err('URL verification error', error)
      props.setState("urlMetadata", { error: "Failed to verify URL" })
      props.setState("urlVerified", false)
    } finally {
      props.setState("isVerifying", false)
    }
  }

  return (
    <div class={s.sourceColumn}>
      <div class={s.formGroup}>
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
              props.setState("urlValue", e.currentTarget.value)
              props.setState("urlMetadata", null)
              props.setState("urlVerified", false)
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
        
        <Show when={props.state.urlMetadata}>
          <Show when={props.state.urlMetadata.error}>
            <div class={s.urlError}>
              {props.state.urlMetadata.error}
            </div>
          </Show>
          
          <Show when={!props.state.urlMetadata.error}>
            <div class={s.urlSuccess}>
              <div class={s.urlSuccessTitle}>
                ✓ URL Verified
              </div>
              <div class={s.urlMetadataGrid}>
                <div class={s.urlMetadataItem}>
                  <span class={s.urlMetadataLabel}>Type:</span>
                  <span class={s.urlMetadataValue}>
                    {props.state.urlMetadata.urlType === 'youtube' ? 'YouTube' :
                     props.state.urlMetadata.urlType === 'streaming' ? 'Streaming Platform' :
                     props.state.urlMetadata.urlType === 'direct-file' ? 'Direct File' :
                     props.state.urlMetadata.urlType === 'document' ? `Document (${props.state.urlMetadata.documentType?.toUpperCase() || 'PDF/DOCX/PPTX'})` : 'Unknown'}
                  </span>
                </div>
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
              </div>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  )
}

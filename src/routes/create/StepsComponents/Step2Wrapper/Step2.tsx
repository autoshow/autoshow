import { For,Show } from "solid-js"
import { isDocumentExtension } from "~/models"
import {
describePresetOutputs,
describePresetSourceConfig,
formatCompatibilityKey,
} from "~/routes/presets/preset-service"
import type { SourceRoutesCreateStepsComponentsStep2WrapperStep2Props as Props } from '~/types'
import { StepHeader } from "../shared"
import Document from "./Document"
import s from "./Step2.module.css"
import Transcription from "./Transcription"

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export default function Step2(props: Props) {
  const isDocumentInput = (): boolean => {
    if (props.urlType === "document") return true
    if (props.hasFile && props.uploadedFileName && isDocumentExtension(props.uploadedFileName)) return true
    return false
  }

  const shouldShowWhisperOptions = (): boolean => {
    if (isDocumentInput()) return false
    if (!props.hasFile && !props.urlType) return true
    return props.hasFile || props.urlType === "direct-file"
  }

  const shouldShowStreamingOptions = (): boolean => {
    if (isDocumentInput()) return false
    if (!props.hasFile && !props.urlType) return true
    return props.urlType === "youtube" || props.urlType === "streaming"
  }

  const shouldShowDocumentOptions = (): boolean => {
    return isDocumentInput()
  }

  const urlTypeLabel = (): string => {
    switch (props.urlMetadata?.urlType) {
      case 'youtube': return 'YouTube'
      case 'streaming': return 'Streaming Platform'
      case 'direct-file': return 'Direct File'
      case 'document': return `Document (${props.urlMetadata?.documentType?.toUpperCase() || 'PDF/PNG/JPG/TIFF/TXT/DOCX/PPTX/XLSX'})`
      default: return 'Unknown'
    }
  }

  return (
    <>
      <StepHeader
        stepNumber={props.stepNumber ?? 2}
        title="Extract Text"
        description={
          isDocumentInput()
            ? "Select a document extraction provider. Available models update to match the current document type."
            : "Choose whether you need speaker labels, then select a transcription service and model."
        }
      />

      {/* Source metadata summary */}
      <Show when={props.urlMetadata && !props.urlMetadata.error}>
        <div class={s.metadataBanner}>
          <div class={s.metadataGrid}>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>Type</span>
              <span class={s.metadataValue}>{urlTypeLabel()}</span>
            </div>
            <Show when={props.urlMetadata?.durationFormatted}>
              <div class={s.metadataItem}>
                <span class={s.metadataLabel}>Duration</span>
                <span class={s.metadataValue}>{props.urlMetadata?.durationFormatted}</span>
              </div>
            </Show>
            <Show when={props.urlMetadata?.fileSizeFormatted}>
              <div class={s.metadataItem}>
                <span class={s.metadataLabel}>Size</span>
                <span class={s.metadataValue}>{props.urlMetadata?.fileSizeFormatted}</span>
              </div>
            </Show>
            <Show when={props.urlMetadata?.mimeType}>
              <div class={s.metadataItem}>
                <span class={s.metadataLabel}>Format</span>
                <span class={s.metadataValue}>{props.urlMetadata?.mimeType}</span>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={props.hasFile && props.uploadedFileName}>
        <div class={s.metadataBanner}>
          <div class={s.metadataGrid}>
            <div class={s.metadataItem}>
              <span class={s.metadataLabel}>File</span>
              <span class={s.metadataValue}>{props.uploadedFileName}</span>
            </div>
            <Show when={props.uploadedFileSize}>
              <div class={s.metadataItem}>
                <span class={s.metadataLabel}>Size</span>
                <span class={s.metadataValue}>{formatBytes(props.uploadedFileSize!)}</span>
              </div>
            </Show>
            <Show when={props.durationSeconds && !props.urlMetadata}>
              <div class={s.metadataItem}>
                <span class={s.metadataLabel}>Duration</span>
                <span class={s.metadataValue}>
                  {Math.floor(props.durationSeconds! / 60)}m {Math.round(props.durationSeconds! % 60)}s
                </span>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={props.isLoadingPresets || props.presetError || (props.compatiblePresets?.length ?? 0) > 0}>
        <section class={s.presetPanel} aria-label="Saved presets">
          <div class={s.presetPanelHeader}>
            <div>
              <h3 class={s.presetPanelTitle}>Saved presets</h3>
              <p class={s.presetPanelDescription}>
                Apply a preset for this source type, or continue with manual settings below.
              </p>
            </div>
          </div>

          <Show when={props.presetError}>
            <div class={s.presetStatus}>{props.presetError}</div>
          </Show>

          <Show when={props.isLoadingPresets}>
            <div class={s.presetStatus}>Loading presets...</div>
          </Show>

          <Show when={!props.isLoadingPresets && !props.presetError && (props.compatiblePresets?.length ?? 0) > 0}>
            <div class={s.presetGrid}>
              <For each={props.compatiblePresets ?? []}>
                {(preset) => {
                  const selected = () => props.activePresetId === preset.id
                  return (
                    <article class={s.presetCard} data-selected={selected() || undefined}>
                      <div>
                        <h4 class={s.presetName}>{preset.name}</h4>
                        <p class={s.presetMeta}>{describePresetOutputs(preset)}</p>
                        <p class={s.presetMeta}>
                          {formatCompatibilityKey(preset.compatibilityKey)} · {describePresetSourceConfig(preset)}
                        </p>
                      </div>
                      <button
                        type="button"
                        class={s.presetButton}
                        disabled={props.disabled}
                        onClick={() => props.onPresetApply?.(preset)}
                      >
                        {selected() ? "Selected" : "Use preset"}
                      </button>
                    </article>
                  )
                }}
              </For>
            </div>
          </Show>
        </section>
      </Show>

      <Show when={shouldShowDocumentOptions()}>
        <Document
          documentType={props.documentType ?? null}
          documentRuntimeCapabilities={props.documentRuntimeCapabilities ?? null}
          documentService={props.documentService}
          documentModel={props.documentModel}
          documentModelSelected={props.documentModelSelected}
          selectDocumentModel={props.selectDocumentModel}
          disabled={props.disabled}
        />
      </Show>

      <Show when={!shouldShowDocumentOptions()}>
        <Transcription
          transcriptionOption={props.transcriptionOption}
          transcriptionModel={props.transcriptionModel}
          transcriptionModelSelected={props.transcriptionModelSelected}
          selectTranscriptionService={props.selectTranscriptionService}
          selectTranscriptionModel={props.selectTranscriptionModel}
          disabled={props.disabled}
          durationSeconds={props.durationSeconds}
          urlMetadata={props.urlMetadata}
          showWhisperOptions={shouldShowWhisperOptions()}
          showStreamingOptions={shouldShowStreamingOptions()}
        />
      </Show>
    </>
  )
}

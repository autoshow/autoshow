import { For,Show,type JSX } from "solid-js"
import {
DOCUMENT_CONFIG,
getImageServiceName,
getLLMServiceName,
getMusicServiceName,
getTTSServiceName,
getTranscriptionServiceName,
getVideoServiceName,
} from "~/models"
import { PROMPT_CONFIG,PROMPT_TYPES } from "~/prompts/text-prompts/text-prompt-config"
import type { DocumentExtractionServiceType,SourceRoutesShowNotesProcessingDetailsShowNoteProcessingDetailsEstimatedProcessingBreakdown as EstimatedProcessingBreakdown,PromptType,SourceRoutesShowNotesProcessingDetailsShowNoteProcessingDetailsProps as Props,StepConfig } from '~/types'
import { formatUsdAsCents } from "~/utils/cost-helpers"
import { formatSourcePublishDate } from "~/utils/source-publish-date"
import shared from "../shared.module.css"
import { MetadataCard } from "./MetadataCard"
import s from "./ShowNoteProcessingDetails.module.css"

function isPromptType(value: string): value is PromptType {
  return PROMPT_TYPES.includes(value as PromptType)
}

function isDocumentServiceType(value: string): value is DocumentExtractionServiceType {
  return value in DOCUMENT_CONFIG
}

function getDocumentServiceName(service: string | null | undefined): string {
  if (!service) return "N/A"
  if (!isDocumentServiceType(service)) return service
  const config = DOCUMENT_CONFIG[service]
  return config?.name || service
}

function formatSelectedPrompts(prompts: string | null | undefined): string {
  if (!prompts) return "All content types"
  const promptList = prompts.split(',').filter(p => p.trim().length > 0)
  if (promptList.length === 0) return "All content types"
  return promptList
    .map(p => {
      const key = p.trim()
      if (!isPromptType(key)) return key
      return PROMPT_CONFIG[key]?.title || key
    })
    .join(', ')
}

function formatTimestamp(value: number | null | undefined): string {
  if (value == null) return "N/A"
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatInputType(value: string | null | undefined): string {
  if (value === "audio-video") return "Audio/video"
  if (value === "document") return "Document"
  return "N/A"
}

function formatCommaList(value: string | null | undefined): string {
  if (!value) return "N/A"
  const values = value.split(",").map(item => item.trim()).filter(Boolean)
  return values.length > 0 ? values.join(", ") : "N/A"
}

function formatJsonText(value: string | null | undefined): string {
  if (!value) return "N/A"

  try {
    return JSON.stringify(JSON.parse(value))
  } catch {
    return value
  }
}

function formatJsonPretty(value: string | null | undefined): string {
  if (!value) return "N/A"

  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

function renderSourceValue(value: string | null | undefined): string | JSX.Element {
  if (!value) return "N/A"
  if (!/^https?:\/\//i.test(value)) return value

  return (
    <a href={value} target="_blank" rel="noopener noreferrer" class={s.metadataLink}>
      {value}
    </a>
  )
}

function renderMetadataJson(value: string | null | undefined): string | JSX.Element {
  if (!value) return "N/A"

  return (
    <details class={s.assetMetadataDetails}>
      <summary class={s.assetMetadataSummary}>View metadata_json</summary>
      <pre class={s.assetMetadataPre}>{formatJsonPretty(value)}</pre>
    </details>
  )
}

function renderStorageLinkActions(viewHref: string, downloadHref: string): JSX.Element {
  return (
    <span class={s.storageActions}>
      <a href={viewHref} target="_blank" rel="noopener noreferrer" class={s.metadataLink}>
        View
      </a>
      <a href={downloadHref} class={s.metadataLink}>
        Download
      </a>
    </span>
  )
}

export default function ShowNoteProcessingDetails(props: Props) {
  const estimatedProcessing = () => {
    if (!props.note.estimated_processing_breakdown) return null

    try {
      return JSON.parse(props.note.estimated_processing_breakdown) as EstimatedProcessingBreakdown
    } catch {
      return null
    }
  }

  const hasStorageMetadata = () => props.storageLinks.length > 0

  const steps = () => {
    const stepList: StepConfig[] = [
      {
        title: "Record Metadata",
        items: [
          { label: "Show Note ID", value: props.note.id },
          { label: "Source", value: renderSourceValue(props.note.url) },
          { label: "Input Type", value: formatInputType(props.note.input_type) },
          { label: "Show Note Generated", value: formatTimestamp(props.note.created_at) },
          { label: "Last Processed", value: formatTimestamp(props.note.processed_at) },
          { label: "Estimated Breakdown", value: formatJsonText(props.note.estimated_processing_breakdown), when: !!props.note.estimated_processing_breakdown },
        ],
      },
      {
        title: "Cost",
        items: [
          { label: "Total Cost", value: formatUsdAsCents(props.note.total_cost_usd) },
          { label: "Estimated Total Time", value: props.formatProcessingTime(estimatedProcessing()?.total) },
        ],
      },
      {
        title: "Step 1 - Prepare Source",
        items: [
          { label: "Filename", value: props.note.audio_file_name || "N/A" },
          { label: "Size", value: props.formatFileSize(props.note.audio_file_size) },
          { label: "Video Published", value: formatSourcePublishDate(props.note.video_publish_date), when: !!props.note.video_publish_date },
          { label: "Channel URL", value: renderSourceValue(props.note.channel_url), when: !!props.note.channel_url },
          { label: "Thumbnail URL", value: renderSourceValue(props.note.video_thumbnail), when: !!props.note.video_thumbnail },
        ],
      },
      {
        title: "Step 2 - Extract Text",
        items: [
          { label: "Service", value: getTranscriptionServiceName(props.note.transcription_service) },
          { label: "Model", value: props.note.transcription_model || "N/A" },
          { label: "Estimated Time", value: props.formatProcessingTime(estimatedProcessing()?.step2) },
          { label: "Processing Time", value: props.formatProcessingTime(props.note.transcription_processing_time) },
          { label: "Token Count", value: props.note.transcription_token_count?.toLocaleString() || "N/A" },
          { label: "Cost", value: formatUsdAsCents(props.note.transcription_cost) },
        ],
        when: !!props.note.transcription_service,
      },
      {
        title: "Step 2 - Extract Text",
        items: [
          { label: "Service", value: getDocumentServiceName(props.note.document_service) },
          { label: "Model", value: props.note.document_model || "N/A" },
          { label: "Type", value: props.note.document_type?.toUpperCase() || "N/A" },
          { label: "Pages", value: props.note.document_page_count?.toLocaleString() || "N/A" },
          { label: "Estimated Time", value: props.formatProcessingTime(estimatedProcessing()?.step2) },
          { label: "Processing Time", value: props.formatProcessingTime(props.note.document_processing_time) },
          { label: "Character Count", value: props.note.document_character_count?.toLocaleString() || "N/A" },
          { label: "Input Tokens", value: props.note.document_input_token_count?.toLocaleString() || "N/A", when: props.note.document_input_token_count !== null },
          { label: "Output Tokens", value: props.note.document_output_token_count?.toLocaleString() || "N/A", when: props.note.document_output_token_count !== null },
          { label: "Cost", value: formatUsdAsCents(props.note.document_cost) },
        ],
        when: !!props.note.document_service,
      },
      {
        title: "Step 3 - Write and TTS",
        items: [
          {
            label: "Mode",
            value: props.note.llm_service ? (props.note.tts_enabled ? "Write + TTS" : "Write") : "Skipped",
          },
          { label: "LLM Service", value: getLLMServiceName(props.note.llm_service), when: !!props.note.llm_service },
          { label: "LLM Model", value: props.note.llm_model || "N/A", when: !!props.note.llm_service },
          { label: "Selected Prompts", value: formatSelectedPrompts(props.note.selected_prompts), when: !!props.note.llm_service },
          { label: "Estimated Time", value: props.formatProcessingTime(estimatedProcessing()?.step3) },
          { label: "LLM Processing Time", value: props.formatProcessingTime(props.note.llm_processing_time), when: !!props.note.llm_service },
          { label: "Input Tokens", value: props.note.llm_input_token_count?.toLocaleString() || "N/A", when: props.note.llm_input_token_count !== null },
          { label: "Output Tokens", value: props.note.llm_output_token_count?.toLocaleString() || "N/A", when: props.note.llm_output_token_count !== null },
          { label: "LLM Cost", value: formatUsdAsCents(props.note.llm_cost), when: !!props.note.llm_service },
          { label: "TTS Service", value: getTTSServiceName(props.note.tts_service), when: !!props.note.tts_enabled },
          { label: "TTS Model", value: props.note.tts_model || "N/A", when: !!props.note.tts_enabled },
          { label: "Voice", value: props.note.tts_voice || "N/A", when: !!props.note.tts_enabled },
          { label: "TTS Processing Time", value: props.formatProcessingTime(props.note.tts_processing_time), when: !!props.note.tts_enabled },
          { label: "Audio Duration", value: props.formatDuration(props.note.tts_audio_duration), when: !!props.note.tts_enabled },
          { label: "Audio File", value: props.note.tts_audio_file || "N/A", when: !!props.note.tts_enabled },
          { label: "TTS Cost", value: formatUsdAsCents(props.note.tts_cost), when: !!props.note.tts_enabled },
        ],
      },
      {
        title: "Step 4 - Image, Video, and Music",
        items: [
          {
            label: "Enabled",
            value: [props.note.image_gen_enabled ? "Image" : null, props.note.video_gen_enabled ? "Video" : null, props.note.music_gen_enabled ? "Music" : null].filter(Boolean).join(", ") || "Skipped",
          },
          { label: "Estimated Time", value: props.formatProcessingTime(estimatedProcessing()?.step4) },
          { label: "Image Service", value: getImageServiceName(props.note.image_gen_service), when: !!props.note.image_gen_enabled },
          { label: "Image Model", value: props.note.image_gen_model || "N/A", when: !!props.note.image_gen_enabled },
          { label: "Selected Image Prompts", value: formatCommaList(props.note.selected_image_prompts), when: !!props.note.image_gen_enabled },
          { label: "Images Generated", value: String(props.note.images_generated || "0"), when: !!props.note.image_gen_enabled },
          { label: "Image Files", value: formatCommaList(props.note.image_files), when: !!props.note.image_gen_enabled },
          { label: "Image Processing Time", value: props.formatProcessingTime(props.note.image_gen_processing_time), when: !!props.note.image_gen_enabled },
          { label: "Image Cost", value: formatUsdAsCents(props.note.image_gen_cost), when: !!props.note.image_gen_enabled },
          { label: "Video Service", value: getVideoServiceName(props.note.video_gen_service), when: !!props.note.video_gen_enabled },
          { label: "Video Model", value: props.note.video_gen_model || "N/A", when: !!props.note.video_gen_enabled },
          { label: "Selected Video Prompts", value: formatCommaList(props.note.selected_video_prompts), when: !!props.note.video_gen_enabled },
          { label: "Videos Generated", value: String(props.note.videos_generated || "0"), when: !!props.note.video_gen_enabled },
          { label: "Video Size", value: props.note.video_size || "N/A", when: !!props.note.video_gen_enabled },
          { label: "Video Duration", value: props.note.video_duration ? `${props.note.video_duration}s` : "N/A", when: !!props.note.video_gen_enabled },
          { label: "Video Files", value: formatCommaList(props.note.video_files), when: !!props.note.video_gen_enabled },
          { label: "Video Processing Time", value: props.formatProcessingTime(props.note.video_gen_processing_time), when: !!props.note.video_gen_enabled },
          { label: "Video Cost", value: formatUsdAsCents(props.note.video_gen_cost), when: !!props.note.video_gen_enabled },
          { label: "Music Service", value: getMusicServiceName(props.note.music_gen_service), when: !!props.note.music_gen_enabled },
          { label: "Music Model", value: props.note.music_gen_model || "N/A", when: !!props.note.music_gen_enabled },
          { label: "Genre", value: props.formatMusicGenre(props.note.music_gen_genre), when: !!props.note.music_gen_enabled },
          { label: "Preset", value: props.note.music_gen_preset || "N/A", when: !!props.note.music_gen_enabled },
          { label: "Target Duration", value: props.note.music_gen_target_duration ? `${props.note.music_gen_target_duration}s` : "N/A", when: !!props.note.music_gen_enabled },
          { label: "Instrumental", value: props.note.music_gen_instrumental === null ? "N/A" : (props.note.music_gen_instrumental ? "Yes" : "No"), when: !!props.note.music_gen_enabled },
          { label: "Sample Rate", value: props.note.music_gen_sample_rate ? `${props.note.music_gen_sample_rate}` : "Auto", when: !!props.note.music_gen_enabled },
          { label: "Bitrate", value: props.note.music_gen_bitrate ? `${props.note.music_gen_bitrate}` : "Auto", when: !!props.note.music_gen_enabled },
          { label: "Music File", value: props.note.music_gen_file || "N/A", when: !!props.note.music_gen_enabled },
          { label: "Music Processing Time", value: props.formatProcessingTime(props.note.music_gen_processing_time), when: !!props.note.music_gen_enabled },
          { label: "Music Duration", value: props.formatDuration(props.note.music_gen_duration), when: !!props.note.music_gen_enabled },
          { label: "Lyrics Length", value: `${props.note.music_gen_lyrics_length || "0"} characters`, when: !!props.note.music_gen_enabled },
          { label: "Lyrics Gen Time", value: props.formatProcessingTime(props.note.music_gen_lyrics_generation_time), when: !!props.note.music_gen_enabled },
          { label: "Music Cost", value: formatUsdAsCents(props.note.music_gen_cost), when: !!props.note.music_gen_enabled },
        ],
      },
      {
        title: "Storage and Backup",
        items: props.storageLinks.map(link => ({
          label: link.label,
          value: renderStorageLinkActions(link.viewHref, link.downloadHref),
          when: true,
        })),
        when: hasStorageMetadata(),
      },
    ]

    return stepList
  }

  const assetRows = () => props.assets.map((asset, index): StepConfig => ({
    title: `Asset Row ${index + 1}`,
    items: [
      { label: "id", value: asset.id },
      { label: "show_note_id", value: asset.show_note_id },
      { label: "job_id", value: asset.job_id },
      { label: "kind", value: asset.kind },
      { label: "service", value: asset.service || "N/A" },
      { label: "model", value: asset.model || "N/A" },
      { label: "file_path", value: asset.file_path || "N/A" },
      { label: "thumbnail_file_path", value: asset.thumbnail_file_path || "N/A" },
      { label: "metadata_json", value: renderMetadataJson(asset.metadata_json) },
      { label: "created_at", value: formatTimestamp(asset.created_at) },
      { label: "updated_at", value: formatTimestamp(asset.updated_at) },
    ],
  }))

  return (
    <section class={shared.section}>
      <h2 class={shared.sectionTitle}>Processing Details</h2>
      <details>
        <summary class={shared.detailsSummary}>Click to expand processing details</summary>
        <div class={s.metadataGrid}>
          <For each={steps()}>
            {(step) => <MetadataCard title={step.title} enabled={step.enabled} items={step.items} when={step.when} />}
          </For>
        </div>
        <Show when={props.assets.length > 0}>
          <h3 class={s.assetRowsTitle}>Generated Asset Rows</h3>
          <div class={s.metadataGrid}>
            <For each={assetRows()}>
              {(step) => <MetadataCard title={step.title} items={step.items} />}
            </For>
          </div>
        </Show>
      </details>
    </section>
  )
}

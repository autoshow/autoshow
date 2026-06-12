import clsx from "clsx"
import { Show } from "solid-js"
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
import type { SourceRoutesShowNotesHeaderShowNoteHeaderProps as Props } from '~/types'
import { formatSourcePublishDate } from "~/utils/source-publish-date"
import s from "./ShowNoteHeader.module.css"

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value)

function SourceReference(props: { label: string; value: string }) {
  return (
    <div class={s.sourceLinkRow}>
      <span class={s.sourceLabel}>{props.label}: </span>
      <Show
        when={isHttpUrl(props.value)}
        fallback={<span class={s.sourceText}>{props.value}</span>}
      >
        <a
          href={props.value}
          target="_blank"
          rel="noopener noreferrer"
          class={s.sourceLink}
        >
          {props.value}
        </a>
      </Show>
    </div>
  )
}

export default function ShowNoteHeader(props: Props) {
  return (
    <header class={s.header}>
      <div class={s.headerTop}>
        <div class={s.titleGroup}>
          <div class={s.titleRow}>
            <h1 class={s.title}>
              {props.note.title}
            </h1>
          </div>

          <div class={s.metadata}>
            <Show when={props.note.author}>
              <span><span class={s.metadataLabel}>Author/Channel:</span> {props.note.author}</span>
            </Show>
            <Show when={props.note.duration}>
              <span><span class={s.metadataLabel}>Duration:</span> {props.note.duration}</span>
            </Show>
            <Show when={props.note.video_publish_date}>
              {(publishDate) => (
                <span><span class={s.metadataLabel}>Video Published:</span> {formatSourcePublishDate(publishDate())}</span>
              )}
            </Show>
            <span><span class={s.metadataLabel}>Show Note Generated:</span> {props.formatDate(props.note.created_at)}</span>
          </div>
        </div>

        <Show when={props.canManage && props.addAssetsHref}>
          <div class={s.actionsPanel}>
            <div class={clsx(ui.actionRow, s.actionsRow)}>
              <a
                href={props.addAssetsHref}
                class={clsx(ui.action, ui.actionPrimary, ui.actionLift, s.primaryAction)}
              >
                Add Assets
              </a>
            </div>
          </div>
        </Show>
      </div>

      <div class={s.tags}>
        <Show when={props.note.transcription_service}>
          <span class={ui.chip}>
            {getTranscriptionServiceName(props.note.transcription_service)}
          </span>
        </Show>
        <Show when={props.note.document_service}>
          <span class={ui.chip}>
            {DOCUMENT_CONFIG[props.note.document_service as keyof typeof DOCUMENT_CONFIG]?.name || props.note.document_service}
          </span>
        </Show>
        <Show when={props.note.llm_service}>
          <span class={ui.chip}>
            {getLLMServiceName(props.note.llm_service)}
          </span>
        </Show>
        <Show when={props.note.tts_enabled}>
          <span class={ui.chip}>
            {getTTSServiceName(props.note.tts_service)}
          </span>
        </Show>
        <Show when={props.note.image_gen_enabled}>
          <span class={ui.chip}>
            {getImageServiceName(props.note.image_gen_service)}
          </span>
        </Show>
        <Show when={props.note.music_gen_enabled}>
          <span class={ui.chip}>
            {getMusicServiceName(props.note.music_gen_service)}
          </span>
        </Show>
        <Show when={props.note.video_gen_enabled}>
          <span class={ui.chip}>
            {getVideoServiceName(props.note.video_gen_service)}
          </span>
        </Show>
      </div>

      <div class={s.sourceLinks}>
        <SourceReference label="Source" value={props.note.url} />
        <Show when={props.note.channel_url}>
          {(channelUrl) => <SourceReference label="Channel" value={channelUrl()} />}
        </Show>
      </div>

      <Show when={props.note.video_thumbnail}>
        <img
          src={props.note.video_thumbnail!}
          alt={props.note.title}
          class={s.thumbnail}
        />
      </Show>
    </header>
  )
}

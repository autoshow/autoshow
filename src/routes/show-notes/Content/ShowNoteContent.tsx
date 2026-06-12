import clsx from "clsx"
import { For,Show,createMemo,createSignal } from "solid-js"
import { getMusicServiceName,getTTSServiceName,getTtsAudioMimeType } from "~/models"
import { IMAGE_PROMPT_CONFIG,IMAGE_PROMPT_TYPES } from "~/prompts/image-prompts"
import { PROMPT_CONFIG,PROMPT_TYPES } from "~/prompts/text-prompts/text-prompt-config"
import { VIDEO_PROMPT_CONFIG,VIDEO_PROMPT_TYPES } from "~/prompts/video-prompts"
import ui from "~/styles/ui.module.css"
import type { ImagePromptType,ShowNoteAsset,SourceRoutesShowNotesContentShowNoteContentProps as Props,StructuredLLMResponse,VideoPromptType } from '~/types'
import shared from "../shared.module.css"
import PromptOutputBlock from "../TextOutput/PromptOutputBlock"
import s from "./ShowNoteContent.module.css"

function isImagePromptType(value: string): value is ImagePromptType {
  return IMAGE_PROMPT_TYPES.includes(value as ImagePromptType)
}

function isVideoPromptType(value: string): value is VideoPromptType {
  return VIDEO_PROMPT_TYPES.includes(value as VideoPromptType)
}

function getFileBaseName(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || filePath
}

function parsePromptTypeFromImageFile(imageFile: string): ImagePromptType | null {
  const fileName = getFileBaseName(imageFile)
  const promptType = fileName.replace('image_', '').replace(/\.[^.]+$/, '')
  return isImagePromptType(promptType) ? promptType : null
}

function parsePromptTypeFromVideoFile(videoFile: string): VideoPromptType | null {
  const fileName = getFileBaseName(videoFile)
  const promptType = fileName.replace('video_', '').replace(/\.[^.]+$/, '')
  return isVideoPromptType(promptType) ? promptType : null
}

function formatAssetDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

function parseAssetMetadata(asset: ShowNoteAsset): Record<string, unknown> {
  if (!asset.metadata_json) return {}
  try {
    const parsed = JSON.parse(asset.metadata_json) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function getNestedResult(metadata: Record<string, unknown>): Record<string, unknown> {
  const result = metadata.result
  return result && typeof result === 'object' && !Array.isArray(result)
    ? result as Record<string, unknown>
    : {}
}

function getMetadataString(asset: ShowNoteAsset, key: string): string | null {
  const metadata = parseAssetMetadata(asset)
  const result = getNestedResult(metadata)
  const value = metadata[key] ?? result[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function getMetadataNumber(asset: ShowNoteAsset, key: string): number | null {
  const metadata = parseAssetMetadata(asset)
  const result = getNestedResult(metadata)
  const value = metadata[key] ?? result[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getAssetTextOutput(asset: ShowNoteAsset): unknown {
  const metadata = parseAssetMetadata(asset)
  return metadata.textOutput ?? null
}

export default function ShowNoteContent(props: Props) {
  const [isTranscriptExpanded, setIsTranscriptExpanded] = createSignal(false)
  const transcriptContentId = "generated-transcript-content"
  const parsedTextOutput = createMemo(() => {
    if (!props.note.text_output) return null
    try {
      return JSON.parse(props.note.text_output)
    } catch {
      return null
    }
  })
  const llmAssets = createMemo(() => props.assets.filter(asset => asset.kind === 'llm'))
  const ttsItems = createMemo(() => {
    const items: Array<{
      id: string
      filePath: string
      service: string | null
      voice: string | null
      duration: number | null
      createdAt: number | null
    }> = []

    if (props.note.tts_enabled && props.note.tts_audio_file) {
      items.push({
        id: 'original',
        filePath: props.note.tts_audio_file,
        service: props.note.tts_service,
        voice: props.note.tts_voice,
        duration: props.note.tts_audio_duration,
        createdAt: null,
      })
    }

    for (const asset of props.assets.filter(candidate => candidate.kind === 'tts' && candidate.file_path)) {
      items.push({
        id: asset.id,
        filePath: asset.file_path!,
        service: asset.service,
        voice: getMetadataString(asset, 'ttsVoice'),
        duration: getMetadataNumber(asset, 'audioDuration'),
        createdAt: asset.created_at,
      })
    }

    return items
  })
  const imageItems = createMemo(() => [
    ...props.getImageFiles(props.note.image_files).map((filePath) => ({
      id: `original-${filePath}`,
      filePath,
      promptType: parsePromptTypeFromImageFile(filePath),
      createdAt: null as number | null,
    })),
    ...props.assets
      .filter(asset => asset.kind === 'image' && asset.file_path)
      .map(asset => ({
        id: asset.id,
        filePath: asset.file_path!,
        promptType: (getMetadataString(asset, 'promptType') || parsePromptTypeFromImageFile(asset.file_path!)) as ImagePromptType | null,
        createdAt: asset.created_at,
      }))
  ])
  const musicItems = createMemo(() => {
    const items: Array<{
      id: string
      filePath: string
      service: string | null
      genre: string | null
      duration: number | null
      lyrics: string | null
      createdAt: number | null
    }> = []

    if (props.note.music_gen_enabled && props.note.music_gen_file) {
      items.push({
        id: 'original',
        filePath: props.note.music_gen_file,
        service: props.note.music_gen_service,
        genre: props.note.music_gen_genre,
        duration: props.note.music_gen_duration,
        lyrics: props.note.music_gen_lyrics,
        createdAt: null,
      })
    }

    for (const asset of props.assets.filter(candidate => candidate.kind === 'music' && candidate.file_path)) {
      items.push({
        id: asset.id,
        filePath: asset.file_path!,
        service: asset.service,
        genre: getMetadataString(asset, 'selectedGenre'),
        duration: getMetadataNumber(asset, 'musicDuration'),
        lyrics: getMetadataString(asset, 'lyricsText'),
        createdAt: asset.created_at,
      })
    }

    return items
  })
  const videoItems = createMemo(() => [
    ...props.getVideoFiles(props.note.video_files).map((filePath) => ({
      id: `original-${filePath}`,
      filePath,
      promptType: parsePromptTypeFromVideoFile(filePath),
      size: props.note.video_size,
      duration: props.note.video_duration,
      createdAt: null as number | null,
    })),
    ...props.assets
      .filter(asset => asset.kind === 'video' && asset.file_path)
      .map(asset => ({
        id: asset.id,
        filePath: asset.file_path!,
        promptType: (getMetadataString(asset, 'promptType') || parsePromptTypeFromVideoFile(asset.file_path!)) as VideoPromptType | null,
        size: getMetadataString(asset, 'size'),
        duration: getMetadataNumber(asset, 'duration'),
        createdAt: asset.created_at,
      }))
  ])

  return (
    <>
      <section class={shared.section}>
        <h2 class={shared.sectionTitle}>
          Extracted Text
        </h2>
        <div
          id={transcriptContentId}
          class={clsx(
            s.transcriptBlock,
            isTranscriptExpanded() ? s.transcriptExpanded : s.transcriptCollapsed,
          )}
        >
          {props.note.transcription}
        </div>
        <button
          type="button"
          class={clsx(ui.action, ui.actionSecondary, ui.actionCompact, ui.actionLift, s.transcriptToggle)}
          aria-controls={transcriptContentId}
          aria-expanded={isTranscriptExpanded() ? "true" : "false"}
          onClick={() => setIsTranscriptExpanded((expanded) => !expanded)}
        >
          {isTranscriptExpanded() ? "Show less" : "Show full extracted text"}
        </button>
      </section>

      <Show when={props.note.text_output}>
        <section class={shared.section}>
          <h2 class={shared.sectionTitle}>
            Generated Text
          </h2>
          <Show
            when={parsedTextOutput()}
            fallback={
              <div class={s.textContent}>
                {props.note.text_output}
              </div>
            }
          >
            {(textOutput) => (
              <div class={s.structuredSummary}>
                <For each={PROMPT_TYPES}>
                  {(key) => (
                    <PromptOutputBlock
                      textOutput={textOutput()}
                      promptKey={key}
                      displayTitle={PROMPT_CONFIG[key].displayTitle}
                      renderType={PROMPT_CONFIG[key].renderType}
                      markdownHtml={props.renderedTextOutput[key] ?? null}
                    />
                  )}
                </For>
              </div>
            )}
          </Show>
        </section>
      </Show>

      <For each={llmAssets()}>
        {(asset) => {
          const textOutput = () => getAssetTextOutput(asset)
          return (
            <section class={shared.section}>
              <h2 class={shared.sectionTitle}>
                Generated Text - {formatAssetDate(asset.created_at)}
              </h2>
              <Show
                when={textOutput()}
                fallback={<div class={s.textContent}>Text output unavailable.</div>}
              >
                {(output) => (
                  <Show
                    when={typeof output() === 'object' && output() !== null}
                    fallback={<div class={s.textContent}>{String(output())}</div>}
                  >
                    <div class={s.structuredSummary}>
                      <For each={PROMPT_TYPES}>
                        {(key) => (
                          <PromptOutputBlock
                            textOutput={output() as StructuredLLMResponse}
                            promptKey={key}
                            displayTitle={PROMPT_CONFIG[key].displayTitle}
                            renderType={PROMPT_CONFIG[key].renderType}
                            markdownHtml={props.renderedAssetTextOutputs[asset.id]?.[key] ?? null}
                          />
                        )}
                      </For>
                    </div>
                  </Show>
                )}
              </Show>
            </section>
          )
        }}
      </For>

      <Show when={ttsItems().length > 0}>
        <section class={shared.section}>
          <h2 class={shared.sectionTitle}>
            Generated Text to Speech Audio
          </h2>
          <div class={s.mediaStack}>
            <For each={ttsItems()}>
              {(item) => (
                <div class={clsx(shared.contentCard, shared.contentCardPadded)}>
                  <audio controls preload="metadata" class={s.audio}>
                    <source
                      src={props.getAudioUrl(props.note.id, item.filePath)}
                      type={getTtsAudioMimeType(item.filePath)}
                    />
                    Your browser does not support the audio element.
                  </audio>
                  <div class={s.audioMeta}>
                    <span>Service: {getTTSServiceName(item.service as Parameters<typeof getTTSServiceName>[0])}</span>
                    <Show when={item.voice}>
                      <span>Voice: {item.voice}</span>
                    </Show>
                    <Show when={item.duration}>
                      <span>Duration: {props.formatDuration(item.duration)}</span>
                    </Show>
                    <Show when={item.createdAt}>
                      <span>Added: {formatAssetDate(item.createdAt!)}</span>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </section>
      </Show>

      <Show when={imageItems().length > 0}>
        <section class={shared.section}>
          <h2 class={shared.sectionTitle}>
            Generated Images
          </h2>
          <div class={s.imageGrid}>
            <For each={imageItems()}>
              {(item) => {
                const promptType = () => item.promptType
                const config = () => {
                  const type = promptType()
                  return type ? IMAGE_PROMPT_CONFIG[type] : null
                }
                const displayTitle = () => config()?.title || getFileBaseName(item.filePath).replace('image_', '').replace(/\.[^.]+$/, '')
                return (
                  <div class={shared.contentCard}>
                    <img
                      src={props.getImageUrl(props.note.id, item.filePath)}
                      alt={displayTitle()}
                      class={s.generatedImage}
                    />
                    <p class={s.imageCaption}>
                      {displayTitle()}
                      <Show when={item.createdAt}>
                        <span class={s.assetDate}>Added {formatAssetDate(item.createdAt!)}</span>
                      </Show>
                    </p>
                  </div>
                )
              }}
            </For>
          </div>
        </section>
      </Show>

      <Show when={musicItems().length > 0}>
        <section class={shared.section}>
          <h2 class={shared.sectionTitle}>
            Generated Music
          </h2>
          <div class={s.mediaStack}>
            <For each={musicItems()}>
              {(item) => (
                <div>
                  <div class={clsx(shared.contentCard, shared.contentCardPadded)}>
                    <audio controls preload="metadata" class={s.audio}>
                      <source
                        src={props.getAudioUrl(props.note.id, item.filePath)}
                        type="audio/mpeg"
                      />
                      Your browser does not support the audio element.
                    </audio>
                    <div class={s.audioMeta}>
                      <span>Service: {getMusicServiceName(item.service as Parameters<typeof getMusicServiceName>[0])}</span>
                      <Show when={item.genre}>
                        <span>Genre: {props.formatMusicGenre(item.genre)}</span>
                      </Show>
                      <Show when={item.duration}>
                        <span>Duration: {props.formatDuration(item.duration)}</span>
                      </Show>
                      <Show when={item.createdAt}>
                        <span>Added: {formatAssetDate(item.createdAt!)}</span>
                      </Show>
                    </div>
                  </div>

                  <Show when={item.lyrics}>
                    <div class={s.lyricsContainer}>
                      <h3 class={s.lyricsTitle}>Lyrics</h3>
                      <div class={shared.codeBlock}>
                        {item.lyrics}
                      </div>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </section>
      </Show>

      <Show when={videoItems().length > 0}>
        <section class={shared.section}>
          <h2 class={shared.sectionTitle}>
            Generated Videos
          </h2>
          <div class={s.videoGrid}>
            <For each={videoItems()}>
              {(item) => {
                const promptType = () => item.promptType
                const config = () => {
                  const type = promptType()
                  return type ? VIDEO_PROMPT_CONFIG[type] : null
                }
                const displayTitle = () => config()?.title || getFileBaseName(item.filePath).replace('video_', '').replace(/\.[^.]+$/, '')
                return (
                  <div class={shared.contentCard}>
                    <video
                      controls
                      preload="metadata"
                      class={s.generatedVideo}
                    >
                      <source
                        src={props.getVideoUrl(props.note.id, item.filePath)}
                        type="video/mp4"
                      />
                      Your browser does not support the video element.
                    </video>
                    <div class={s.videoCaption}>
                      <p class={s.videoCaptionTitle}>{displayTitle()}</p>
                      <div class={s.videoMeta}>
                        <Show when={item.size}>
                          <span>{item.size}</span>
                        </Show>
                        <Show when={item.duration}>
                          <span>{item.duration}s</span>
                        </Show>
                        <Show when={item.createdAt}>
                          <span>Added {formatAssetDate(item.createdAt!)}</span>
                        </Show>
                      </div>
                    </div>
                  </div>
                )
              }}
            </For>
          </div>
        </section>
      </Show>
    </>
  )
}

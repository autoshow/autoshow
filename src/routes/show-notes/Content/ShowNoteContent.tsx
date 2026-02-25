import { Show, For, createMemo } from "solid-js"
import type { ShowNote, StructuredLLMResponse, ImagePromptType, VideoPromptType } from "~/types"
import { TTS_CONFIG, MUSIC_CONFIG } from "~/models"
import { PROMPT_CONFIG, PROMPT_TYPES } from "~/prompts/text-prompts/text-prompt-config"
import { IMAGE_PROMPT_CONFIG, IMAGE_PROMPT_TYPES } from "~/prompts/image-prompts"
import { VIDEO_PROMPT_CONFIG, VIDEO_PROMPT_TYPES } from "~/prompts/video-prompts"
import s from "./ShowNoteContent.module.css"
import PromptOutputBlock from "../TextOutput/PromptOutputBlock"

function isImagePromptType(value: string): value is ImagePromptType {
  return IMAGE_PROMPT_TYPES.includes(value as ImagePromptType)
}

function isVideoPromptType(value: string): value is VideoPromptType {
  return VIDEO_PROMPT_TYPES.includes(value as VideoPromptType)
}

function parsePromptTypeFromImageFile(imageFile: string): ImagePromptType | null {
  const promptType = imageFile.replace('image_', '').replace('.png', '')
  return isImagePromptType(promptType) ? promptType : null
}

function parsePromptTypeFromVideoFile(videoFile: string): VideoPromptType | null {
  const promptType = videoFile.replace('video_', '').replace('.mp4', '')
  return isVideoPromptType(promptType) ? promptType : null
}

function getMusicServiceName(service: string | null | undefined): string {
  if (!service) return "N/A"
  return MUSIC_CONFIG[service as keyof typeof MUSIC_CONFIG]?.name || service
}

type Props = {
  note: ShowNote
  formatDuration: (seconds: number | null | undefined) => string
  formatMusicGenre: (genre: string | null | undefined) => string
  getAudioUrl: (id: string, audioFileName: string | null | undefined) => string
  getImageUrl: (id: string, imageFileName: string | null | undefined) => string
  getVideoUrl: (id: string, videoFileName: string | null | undefined) => string
  getImageFiles: (imageFilesString: string | null | undefined) => string[]
  getVideoFiles: (videoFilesString: string | null | undefined) => string[]
}

export default function ShowNoteContent(props: Props) {
  const parsedTextOutput = createMemo((): StructuredLLMResponse | null => {
    try {
      return JSON.parse(props.note.text_output)
    } catch {
      return null
    }
  })

  return (
    <>
      <section class={s.section}>
        <h2 class={s.sectionTitle}>
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
                  />
                )}
              </For>
            </div>
          )}
        </Show>
      </section>

      <Show when={props.note.tts_enabled && props.note.tts_audio_file}>
        <section class={s.section}>
          <h2 class={s.sectionTitle}>
            Generated Text to Speech Audio
          </h2>
          <div class={s.audioPlayer}>
            <audio
              controls
              preload="metadata"
              class={s.audio}
            >
              <source
                src={props.getAudioUrl(props.note.id, props.note.tts_audio_file!)}
                type={props.note.tts_service === 'elevenlabs' ? 'audio/mpeg' : 'audio/wav'}
              />
              Your browser does not support the audio element.
            </audio>
            <div class={s.audioMeta}>
              <span>Service: {props.note.tts_service === 'openai'
                ? TTS_CONFIG.openai.name
                : props.note.tts_service === 'elevenlabs'
                ? TTS_CONFIG.elevenlabs.name
                : props.note.tts_service || "Unknown"}</span>
              <span>Voice: {props.note.tts_voice}</span>
              <Show when={props.note.tts_audio_duration}>
                <span>Duration: {props.formatDuration(props.note.tts_audio_duration!)}</span>
              </Show>
            </div>
          </div>
        </section>
      </Show>

      <Show when={props.note.image_gen_enabled && props.note.image_files}>
        <section class={s.section}>
          <h2 class={s.sectionTitle}>
            Generated Images
          </h2>
          <div class={s.imageGrid}>
            <For each={props.getImageFiles(props.note.image_files)}>
              {(imageFile) => {
                const promptType = parsePromptTypeFromImageFile(imageFile)
                const config = promptType ? IMAGE_PROMPT_CONFIG[promptType] : null
                const displayTitle = config?.title || imageFile.replace('image_', '').replace('.png', '')
                return (
                  <div class={s.imageCard}>
                    <img
                      src={props.getImageUrl(props.note.id, imageFile)}
                      alt={displayTitle}
                      class={s.generatedImage}
                    />
                    <p class={s.imageCaption}>
                      {displayTitle}
                    </p>
                  </div>
                )
              }}
            </For>
          </div>
        </section>
      </Show>

      <Show when={props.note.music_gen_enabled && props.note.music_gen_file}>
        <section class={s.section}>
          <h2 class={s.sectionTitle}>
            Generated Music
          </h2>
          <div class={s.musicPlayer}>
            <audio
              controls
              preload="metadata"
              class={s.audio}
            >
              <source
                src={props.getAudioUrl(props.note.id, props.note.music_gen_file!)}
                type="audio/mpeg"
              />
              Your browser does not support the audio element.
            </audio>
            <div class={s.audioMeta}>
              <span>Service: {getMusicServiceName(props.note.music_gen_service)}</span>
              <span>Genre: {props.formatMusicGenre(props.note.music_gen_genre)}</span>
              <Show when={props.note.music_gen_duration}>
                <span>Duration: {props.formatDuration(props.note.music_gen_duration!)}</span>
              </Show>
            </div>
          </div>

          <Show when={props.note.music_gen_lyrics}>
            <div class={s.lyricsContainer}>
              <h3 class={s.lyricsTitle}>Lyrics</h3>
              <div class={s.lyricsBox}>
                {props.note.music_gen_lyrics}
              </div>
            </div>
          </Show>
        </section>
      </Show>

      <Show when={props.note.video_gen_enabled && props.note.video_files}>
        <section class={s.section}>
          <h2 class={s.sectionTitle}>
            Generated Videos
          </h2>
          <div class={s.videoGrid}>
            <For each={props.getVideoFiles(props.note.video_files)}>
              {(videoFile) => {
                const promptType = parsePromptTypeFromVideoFile(videoFile)
                const config = promptType ? VIDEO_PROMPT_CONFIG[promptType] : null
                const displayTitle = config?.title || videoFile.replace('video_', '').replace('.mp4', '')
                return (
                  <div class={s.videoCard}>
                    <video
                      controls
                      preload="metadata"
                      class={s.generatedVideo}
                    >
                      <source
                        src={props.getVideoUrl(props.note.id, videoFile)}
                        type="video/mp4"
                      />
                      Your browser does not support the video element.
                    </video>
                    <div class={s.videoCaption}>
                      <p class={s.videoCaptionTitle}>{displayTitle}</p>
                      <div class={s.videoMeta}>
                        <Show when={props.note.video_size}>
                          <span>{props.note.video_size}</span>
                        </Show>
                        <Show when={props.note.video_duration}>
                          <span>{props.note.video_duration}s</span>
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

      <section class={s.section}>
        <h2 class={s.sectionTitle}>
          Generated Transcript
        </h2>
        <details>
          <summary class={s.detailsSummary}>
            Click to expand transcript
          </summary>
          <div class={s.transcriptionBox}>
            {props.note.transcription}
          </div>
        </details>
      </section>
    </>
  )
}

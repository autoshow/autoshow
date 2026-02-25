import { Show } from "solid-js"
import type { StepsProps, LLMServiceType } from "~/types"
import { LLM_CONFIG } from "~/models"
import Step1 from "./Step1Wrapper/Step1"
import Step2 from "./Step2Wrapper/Step2"
import Step3 from "./Step3Wrapper/Step3"
import Step4 from "./Step4Wrapper/Step4"
import Step5 from "./Step5Wrapper/Step5"
import Step6 from "./Step6Wrapper/Step6"
import Step7 from "./Step7Wrapper/Step7"
import Step8 from "./Step8Wrapper/Step8"
import s from "./Steps.module.css"

function isLLMServiceType(value: string): value is LLMServiceType {
  return value in LLM_CONFIG
}

export default function Steps(props: StepsProps) {
  return (
    <Show when={!props.isProcessing()}>
      <form action={props.submitAction} method="post" class={s.form}>
        <input type="hidden" name="uploadedFilePath" value={props.state.uploadedFilePath} />
        <input type="hidden" name="uploadedFileName" value={props.state.uploadedFileName} />
        <input type="hidden" name="urlType" value={props.state.urlMetadata?.urlType || ""} />
        <input type="hidden" name="urlDuration" value={props.state.urlMetadata?.duration?.toString() || ""} />
        <input type="hidden" name="urlFileSize" value={props.state.urlMetadata?.fileSize?.toString() || ""} />
        <input type="hidden" name="transcriptionModel" value={props.state.transcriptionModel} />
        <input type="hidden" name="documentService" value={props.state.documentService || 'llamaparse'} />
        <input type="hidden" name="documentModel" value={props.state.documentModel} />
        <input type="hidden" name="ttsEnabled" value={props.state.ttsSkipped ? "false" : "true"} />
        <input type="hidden" name="imageGenEnabled" value={props.state.imageGenSkipped ? "false" : "true"} />
        <input type="hidden" name="videoGenEnabled" value={props.state.videoGenSkipped ? "false" : "true"} />

        <Step1
          state={props.state}
          setState={props.setState}
          disabled={props.isProcessing() || props.state.isUploading}
        />

        <Step2
          transcriptionOption={props.state.transcriptionOption}
          setTranscriptionOption={(value) => props.setState("transcriptionOption", value)}
          disabled={props.isProcessing() || props.state.isUploading}
          urlType={props.state.urlMetadata?.urlType}
          hasFile={!!props.state.selectedFile && !!props.state.uploadedFilePath}
          transcriptionModel={props.state.transcriptionModel}
          setTranscriptionModel={(value) => props.setState("transcriptionModel", value)}
          documentService={props.state.documentService}
          setDocumentService={(value) => props.setState("documentService", value)}
          documentModel={props.state.documentModel}
          setDocumentModel={(value) => props.setState("documentModel", value)}
          uploadedFileName={props.state.uploadedFileName}
          durationSeconds={props.state.urlMetadata?.duration ?? props.state.uploadedFileDuration}
        />

        <Step3
          selectedPrompts={props.state.selectedPrompts}
          setSelectedPrompts={(prompts) => props.setState("selectedPrompts", prompts)}
          disabled={props.isProcessing() || props.state.isUploading}
        />

        <Step4
          llmService={props.state.llmService}
          setLlmService={(value) => {
            if (isLLMServiceType(value)) {
              props.setState("llmService", value)
            }
          }}
          llmModel={props.state.llmModel}
          setLlmModel={(value) => props.setState("llmModel", value)}
          disabled={props.isProcessing() || props.state.isUploading}
        />

        <Step5
          ttsSkipped={props.state.ttsSkipped}
          setTtsSkipped={(value) => props.setState("ttsSkipped", value)}
          ttsService={props.state.ttsService}
          setTtsService={(value) => props.setState("ttsService", value)}
          ttsVoice={props.state.ttsVoice}
          setTtsVoice={(value) => props.setState("ttsVoice", value)}
          ttsModel={props.state.ttsModel}
          setTtsModel={(value) => props.setState("ttsModel", value)}
          disabled={props.isProcessing() || props.state.isUploading}
        />

        <Step6
          imageGenSkipped={props.state.imageGenSkipped}
          setImageGenSkipped={(value) => {
            props.setState("imageGenSkipped", value)
          }}
          selectedImagePrompts={props.state.selectedImagePrompts}
          setSelectedImagePrompts={(prompts) => {
            props.setState("selectedImagePrompts", prompts)
          }}
          imageService={props.state.imageService}
          setImageService={(service) => {
            props.setState("imageService", service)
          }}
          imageModel={props.state.imageModel}
          setImageModel={(model) => {
            props.setState("imageModel", model)
          }}
          imageDimensionOrRatio={props.state.imageDimensionOrRatio}
          setImageDimensionOrRatio={(ratio) => {
            props.setState("imageDimensionOrRatio", ratio)
          }}
          disabled={props.isProcessing() || props.state.isUploading}
        />

        <Step7
          musicGenSkipped={props.state.musicGenSkipped}
          setMusicGenSkipped={(value) => {
            props.setState("musicGenSkipped", value)
          }}
          musicService={props.state.musicService}
          setMusicService={(service) => {
            props.setState("musicService", service)
          }}
          musicModel={props.state.musicModel}
          setMusicModel={(model) => {
            props.setState("musicModel", model)
          }}
          selectedMusicGenre={props.state.selectedMusicGenre}
          setSelectedMusicGenre={(genre) => {
            props.setState("selectedMusicGenre", genre)
          }}
          musicPreset={props.state.musicPreset}
          setMusicPreset={(preset) => {
            props.setState("musicPreset", preset)
          }}
          musicDurationSeconds={props.state.musicDurationSeconds}
          setMusicDurationSeconds={(seconds) => {
            props.setState("musicDurationSeconds", seconds)
          }}
          musicInstrumental={props.state.musicInstrumental}
          setMusicInstrumental={(value) => {
            props.setState("musicInstrumental", value)
          }}
          musicSampleRate={props.state.musicSampleRate}
          setMusicSampleRate={(value) => {
            props.setState("musicSampleRate", value)
          }}
          musicBitrate={props.state.musicBitrate}
          setMusicBitrate={(value) => {
            props.setState("musicBitrate", value)
          }}
          disabled={props.isProcessing() || props.state.isUploading}
        />

        <Step8
          videoGenSkipped={props.state.videoGenSkipped}
          setVideoGenSkipped={(value) => {
            props.setState("videoGenSkipped", value)
          }}
          videoService={props.state.videoService}
          setVideoService={(service) => {
            props.setState("videoService", service)
          }}
          selectedVideoPrompts={props.state.selectedVideoPrompts}
          setSelectedVideoPrompts={(prompts) => {
            props.setState("selectedVideoPrompts", prompts)
          }}
          videoModel={props.state.videoModel}
          setVideoModel={(model) => {
            props.setState("videoModel", model)
          }}
          videoSize={props.state.videoSize}
          setVideoSize={(size) => {
            props.setState("videoSize", size)
          }}
          videoDuration={props.state.videoDuration}
          setVideoDuration={(duration) => {
            props.setState("videoDuration", duration)
          }}
          videoAspectRatio={props.state.videoAspectRatio}
          setVideoAspectRatio={(ratio) => {
            props.setState("videoAspectRatio", ratio)
          }}
          disabled={props.isProcessing() || props.state.isUploading}
        />

        <button
          type="submit"
          disabled={!props.canSubmit()}
          class={!props.canSubmit() ? s.submitButtonDisabled : s.submitButton}
        >
          {props.state.isUploading ? `Uploading... ${props.state.uploadProgress.toFixed(0)}%` : "Create Show Note"}
        </button>
      </form>
    </Show>
  )
}

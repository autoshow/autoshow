import { Show } from "solid-js"
import type { StepsProps } from "~/types/main"
import Step1 from "./Step1Wrapper/Step1"
import Step2 from "./Step2Wrapper/Step2"
import Step3 from "./Step3Wrapper/Step3"
import Step4 from "./Step4Wrapper/Step4"
import Step5 from "./Step5Wrapper/Step5"
import Step6 from "./Step6Wrapper/Step6"
import Step7 from "./Step7Wrapper/Step7"
import Step8 from "./Step8Wrapper/Step8"
import s from "./Steps.module.css"

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
        <input type="hidden" name="ttsEnabled" value={props.state.ttsSkipped ? "false" : "true"} />
        <input type="hidden" name="imageGenEnabled" value={props.state.imageGenSkipped ? "false" : "true"} />
        <input type="hidden" name="videoGenEnabled" value={props.state.videoGenSkipped ? "false" : "true"} />

        <Step1
          selectedFile={props.state.selectedFile}
          setSelectedFile={(file) => {
            props.setState("selectedFile", file)
            props.handleFileChange(file)
          }}
          disabled={props.isProcessing() || props.state.isUploading}
          urlValue={props.state.urlValue}
          setUrlValue={(value) => {
            props.setState("urlValue", value)
            props.setState("urlMetadata", null)
            props.setState("urlVerified", false)
          }}
          onVerifyUrl={props.handleVerifyUrl}
          isVerifying={props.state.isVerifying}
          urlMetadata={props.state.urlMetadata}
          uploadProgress={props.state.uploadProgress}
        />

        <Step2
          transcriptionOption={props.state.transcriptionOption}
          setTranscriptionOption={(value) => props.setState("transcriptionOption", value)}
          disabled={props.isProcessing() || props.state.isUploading}
          urlType={props.state.urlMetadata?.urlType}
          hasFile={!!props.state.selectedFile && !!props.state.uploadedFilePath}
          transcriptionModel={props.state.transcriptionModel}
          setTranscriptionModel={(value) => props.setState("transcriptionModel", value)}
        />

        <Step3
          selectedPrompts={props.state.selectedPrompts}
          setSelectedPrompts={(prompts) => props.setState("selectedPrompts", prompts)}
          disabled={props.isProcessing() || props.state.isUploading}
        />

        <Step4
          llmService={props.state.llmService}
          setLlmService={(value) => props.setState("llmService", value as "openai" | "anthropic")}
          llmModel={props.state.llmModel}
          setLlmModel={(value) => props.setState("llmModel", value)}
          disabled={props.isProcessing() || props.state.isUploading}
        />

        <Step5
          ttsSkipped={props.state.ttsSkipped}
          setTtsSkipped={(value) => {
            props.setState("ttsSkipped", value)
          }}
          ttsService={props.state.ttsService}
          setTtsService={(value) => props.setState("ttsService", value)}
          ttsVoice={props.state.ttsVoice}
          setTtsVoice={(value) => props.setState("ttsVoice", value)}
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
          disabled={props.isProcessing() || props.state.isUploading}
        />

        <Step7
          musicGenSkipped={props.state.musicGenSkipped}
          setMusicGenSkipped={(value) => {
            props.setState("musicGenSkipped", value)
          }}
          selectedMusicGenre={props.state.selectedMusicGenre}
          setSelectedMusicGenre={(genre) => {
            props.setState("selectedMusicGenre", genre)
          }}
          disabled={props.isProcessing() || props.state.isUploading}
        />

        <Step8
          videoGenSkipped={props.state.videoGenSkipped}
          setVideoGenSkipped={(value) => {
            props.setState("videoGenSkipped", value)
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

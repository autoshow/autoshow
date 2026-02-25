import { Show } from "solid-js"
import { StepHeader } from "../shared"
import { isDocumentExtension } from "~/models"
import Transcription from "./Transcription"
import Document from "./Document"

type Props = {
  transcriptionOption: string
  setTranscriptionOption: (value: string) => void
  disabled: boolean | undefined
  urlType?: string
  hasFile: boolean
  transcriptionModel: string
  setTranscriptionModel: (value: string) => void
  documentService: string
  setDocumentService: (value: string) => void
  documentModel: string
  setDocumentModel: (value: string) => void
  uploadedFileName: string
  durationSeconds?: number
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

  return (
    <>
      <StepHeader
        stepNumber={2}
        title={isDocumentInput() ? "Extract Document Text" : "Run Transcription"}
        description={isDocumentInput() 
          ? "Select a document extraction tier. Higher tiers provide better accuracy for complex layouts."
          : "Select a transcription service and model. Options will update based on your source selection."}
      />

      <input 
        type="hidden" 
        name="transcriptionOption" 
        value={props.transcriptionOption} 
      />

      <Show when={shouldShowDocumentOptions()}>
        <Document
          transcriptionOption={props.transcriptionOption}
          setTranscriptionOption={props.setTranscriptionOption}
          documentService={props.documentService}
          setDocumentService={props.setDocumentService}
          documentModel={props.documentModel}
          setDocumentModel={props.setDocumentModel}
          disabled={props.disabled}
        />
      </Show>

      <Show when={!shouldShowDocumentOptions()}>
        <Transcription
          transcriptionOption={props.transcriptionOption}
          setTranscriptionOption={props.setTranscriptionOption}
          transcriptionModel={props.transcriptionModel}
          setTranscriptionModel={props.setTranscriptionModel}
          disabled={props.disabled}
          durationSeconds={props.durationSeconds}
          showWhisperOptions={shouldShowWhisperOptions()}
          showStreamingOptions={shouldShowStreamingOptions()}
        />
      </Show>
    </>
  )
}

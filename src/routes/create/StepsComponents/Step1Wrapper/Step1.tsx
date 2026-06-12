import { Show } from 'solid-js'
import type { SourceRoutesCreateStepsComponentsStep1WrapperStep1Props as Props } from '~/types'
import { StepHeader } from "../shared"
import File from "./File"
import GoogleDrive from "./GoogleDrive"
import s from "./Step1.module.css"
import URL from "./URL"

export default function Step1(props: Props) {
  const googleDriveImportConfigured = () => props.googleDriveImportConfigured === true

  return (
    <>
      <StepHeader
        stepNumber={1}
        title="Choose Target"
        description={googleDriveImportConfigured()
          ? "Start with a URL, upload a file, or import from Google Drive."
          : "Start with a URL or upload a file."}
      />

      <div class={s.sourceContainer}>
        <URL
          state={props.state}
          setState={props.setState}
          documentRuntimeCapabilities={props.documentRuntimeCapabilities}
          disabled={props.disabled}
        />
        <File
          state={props.state}
          setState={props.setState}
          documentRuntimeCapabilities={props.documentRuntimeCapabilities}
          disabled={props.disabled}
        />
        <Show when={googleDriveImportConfigured()}>
          <GoogleDrive
            state={props.state}
            setState={props.setState}
            documentRuntimeCapabilities={props.documentRuntimeCapabilities}
            disabled={props.disabled}
          />
        </Show>
      </div>
    </>
  )
}

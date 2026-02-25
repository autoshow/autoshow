import type { StepsProps } from "~/types"
import s from "./Step1.module.css"
import { StepHeader } from "../shared"
import URL from "./URL"
import File from "./File"

type Props = {
  state: StepsProps['state']
  setState: StepsProps['setState']
  disabled: boolean | undefined
}

export default function Step1(props: Props) {
  return (
    <>
      <StepHeader
        stepNumber={1}
        title="Select Source"
        description="Choose a video/document URL or upload a file to begin. Supports audio, video, PDF, DOCX, and PPTX files."
      />

      <div class={s.sourceContainer}>
        <URL
          state={props.state}
          setState={props.setState}
          disabled={props.disabled}
        />
        <File
          state={props.state}
          setState={props.setState}
          disabled={props.disabled}
        />
      </div>
    </>
  )
}

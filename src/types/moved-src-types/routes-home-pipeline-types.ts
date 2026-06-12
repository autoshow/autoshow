export type SourceRoutesHomePipelineStep = {
  step: number
  title: string
  description: string
}

export type SourceRoutesHomePipelineProps = {
  steps: SourceRoutesHomePipelineStep[]
  class?: string | undefined
}

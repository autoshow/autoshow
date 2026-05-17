export type SourceRoutesApiProcess02RunTranscribeTranscriptionServicesDeepinfraParseDeepinfraOutputDeepInfraNativeResponse = {
  text: string
  segments?: Array<{
    id: number
    start: number
    end: number
    text: string
  }>
  inference_status?: {
    cost?: number
    runtime_ms?: number
    status?: string
  }
}

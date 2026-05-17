export type SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunGeminiVideoGeminiVideosOperation = {
  name?: string
  done?: boolean
  response?: Record<string, unknown>
  error?: {
    code?: number
    message?: string
    status?: string
  }
  [key: string]: unknown
}

export type SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunGeminiVideoGeminiVideoFile = Record<string, unknown> & {
  uri?: string
  mimeType?: string
}

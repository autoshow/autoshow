export type SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunGrokVideoGrokVideoResponse = {
  request_id?: string
  response_id?: string
  error?: {
    message?: string
    type?: string
  }
}

export type SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunGrokVideoGrokVideoStatusResponse = {
  status?: 'pending' | 'completed' | 'failed'
  video?: {
    url?: string
    duration?: number
    respect_moderation?: boolean
  }
  model?: string
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

export type SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunGlmVideoGlmVideoResponse = {
  id?: string
  task_id?: string
  request_id?: string
}

export type SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunGlmVideoGlmPollResponse = {
  task_status?: string
  video_result?: Array<{
    url?: string
    cover_image_url?: string
  }>
}

export type SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunGlmVideoGlmApiError = Error & {
  status?: number
}

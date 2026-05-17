export type SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunMinimaxVideoMinimaxResolution = '768P' | '1080P' | '720P'

export type SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunMinimaxVideoMinimaxVideoResponse = {
  task_id?: string
  base_resp?: { status_code?: number; status_msg?: string }
}

export type SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunMinimaxVideoMinimaxQueryResponse = {
  status?: string
  file_id?: string
  base_resp?: { status_code?: number; status_msg?: string }
}

export type SourceRoutesApiProcess04RunMediaRunVideoVideoServicesRunMinimaxVideoMinimaxFileResponse = {
  file?: { download_url?: string }
  base_resp?: { status_code?: number; status_msg?: string }
}

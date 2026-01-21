import { Show, createSignal } from "solid-js"
import s from "./Step1.module.css"

type Props = {
  selectedFile: File | null
  setSelectedFile: (file: File | null) => void
  disabled: boolean | undefined
  urlValue: string
  setUrlValue: (value: string) => void
  onVerifyUrl: () => void
  isVerifying: boolean
  urlMetadata: any
  uploadProgress: number
}

export default function Step1(props: Props) {
  const [uploadMode, setUploadMode] = createSignal<'small' | 'chunked'>('small')

  const handleFileChange = (e: Event): void => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setUploadMode('chunked')
      } else {
        setUploadMode('small')
      }
      props.setSelectedFile(file)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <>
      <h2 class={s.stepHeading}>Step 1: Select Source</h2>

      <div class={s.instructionBanner}>
        Choose a video URL or upload a file to begin. You must select one source to proceed.
      </div>

      <div class={s.sourceContainer}>
        <div class={s.sourceColumn}>
          <div class={s.formGroup}>
            <label for="url" class={s.label}>
              Video URL
            </label>
            <div class={s.urlInputContainer}>
              <input 
                id="url"
                name="url"
                type="url"
                value="https://www.youtube.com/watch?v=MORMZXEaONk"
                onInput={(e) => props.setUrlValue(e.currentTarget.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={props.disabled}
                class={s.input}
              />
              <button
                type="button"
                onClick={props.onVerifyUrl}
                disabled={props.disabled || props.isVerifying || !props.urlValue}
                class={s.verifyButton}
              >
                {props.isVerifying ? "Verifying..." : "Verify"}
              </button>
            </div>
            
            <Show when={props.urlMetadata}>
              <Show when={props.urlMetadata.error}>
                <div class={s.urlError}>
                  {props.urlMetadata.error}
                </div>
              </Show>
              
              <Show when={!props.urlMetadata.error}>
                <div class={s.urlSuccess}>
                  <div class={s.urlSuccessTitle}>
                    ✓ URL Verified
                  </div>
                  <div class={s.urlMetadataGrid}>
                    <div class={s.urlMetadataItem}>
                      <span class={s.urlMetadataLabel}>Type:</span>
                      <span class={s.urlMetadataValue}>
                        {props.urlMetadata.urlType === 'youtube' ? 'YouTube' :
                         props.urlMetadata.urlType === 'streaming' ? 'Streaming Platform' :
                         props.urlMetadata.urlType === 'direct-file' ? 'Direct File' : 'Unknown'}
                      </span>
                    </div>
                    <Show when={props.urlMetadata.durationFormatted}>
                      <div class={s.urlMetadataItem}>
                        <span class={s.urlMetadataLabel}>Duration:</span>
                        <span class={s.urlMetadataValue}>{props.urlMetadata.durationFormatted}</span>
                      </div>
                    </Show>
                    <Show when={props.urlMetadata.fileSizeFormatted}>
                      <div class={s.urlMetadataItem}>
                        <span class={s.urlMetadataLabel}>Size:</span>
                        <span class={s.urlMetadataValue}>{props.urlMetadata.fileSizeFormatted}</span>
                      </div>
                    </Show>
                    <Show when={props.urlMetadata.mimeType}>
                      <div class={s.urlMetadataItem}>
                        <span class={s.urlMetadataLabel}>Format:</span>
                        <span class={s.urlMetadataValue}>{props.urlMetadata.mimeType}</span>
                      </div>
                    </Show>
                  </div>
                </div>
              </Show>
            </Show>
          </div>
        </div>

        <div class={s.sourceColumn}>
          <div class={s.formGroup}>
            <label for="fileUpload" class={s.label}>
              Upload File (Any Size)
            </label>
            <div class={s.fileUploadContainer}>
              <input 
                id="fileUpload"
                type="file"
                accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.mov,.avi,.mkv,.flac,.ogg"
                onChange={handleFileChange}
                disabled={props.disabled}
                class={s.fileInput}
              />
              <Show when={props.selectedFile}>
                <div class={s.fileInfo}>
                  <span class={s.fileName}>{props.selectedFile?.name}</span>
                  <span class={s.fileSize}>
                    {formatBytes(props.selectedFile?.size || 0)}
                  </span>
                  <Show when={uploadMode() === 'chunked'}>
                    <span class={s.uploadMode}>Chunked upload</span>
                  </Show>
                </div>
                <Show when={props.uploadProgress > 0 && props.uploadProgress < 100}>
                  <div class={s.progressContainer}>
                    <div class={s.progressBar} style={{ width: `${props.uploadProgress}%` }} />
                    <span class={s.progressText}>{props.uploadProgress.toFixed(1)}%</span>
                  </div>
                </Show>
              </Show>
            </div>
            <p class={s.helpText}>
              Files over 100MB will automatically use chunked upload for reliability.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
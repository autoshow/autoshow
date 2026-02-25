import { Show, createSignal } from "solid-js"
import type { StepsProps } from "~/types"
import { getDefaultTranscriptionModelForService, getDefaultDocumentModel, getDefaultDocumentService, isDocumentExtension } from "~/models"
import { err } from "~/utils/logging"
import shared from "../shared/shared.module.css"
import s from "./File.module.css"

const CHUNK_SIZE = 5 * 1024 * 1024

type Props = {
  state: StepsProps['state']
  setState: StepsProps['setState']
  disabled: boolean | undefined
}

export default function File(props: Props) {
  const [uploadMode, setUploadMode] = createSignal<'small' | 'chunked'>('small')

  const finalizeFileSource = (filePath: string, fileName: string, duration?: number) => {
    const isDocument = isDocumentExtension(fileName)
    if (isDocument) {
      const defaultService = getDefaultDocumentService()
      props.setState({
        uploadedFilePath: filePath,
        uploadedFileName: fileName,
        uploadedFileDuration: undefined,
        uploadProgress: 100,
        urlValue: "",
        urlMetadata: null,
        urlVerified: false,
        transcriptionOption: "groq",
        transcriptionModel: getDefaultTranscriptionModelForService("groq"),
        documentService: defaultService,
        documentModel: getDefaultDocumentModel(defaultService)
      })
    } else {
      props.setState({
        uploadedFilePath: filePath,
        uploadedFileName: fileName,
        uploadedFileDuration: duration,
        uploadProgress: 100,
        urlValue: "",
        urlMetadata: null,
        urlVerified: false,
        transcriptionOption: "groq",
        transcriptionModel: getDefaultTranscriptionModelForService("groq")
      })
    }
  }

  const uploadFileChunked = async (file: globalThis.File): Promise<void> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const fileId = `${Date.now()}_${Math.random().toString(36).slice(2)}`
    props.setState("uploadProgress", 0)
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)
      const formData = new FormData()
      formData.append("chunk", chunk)
      formData.append("chunkIndex", i.toString())
      formData.append("totalChunks", totalChunks.toString())
      formData.append("fileId", fileId)
      formData.append("fileName", file.name)
      const response = await fetch("/api/download/upload-chunk", {
        method: "POST",
        body: formData
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Chunk upload failed")
      }
      const progress = ((i + 1) / totalChunks) * 100
      props.setState("uploadProgress", progress)
      if (result.complete) {
        finalizeFileSource(result.filePath, result.fileName, result.duration)
        return
      }
    }
  }

  const uploadFileSimple = async (file: globalThis.File): Promise<void> => {
    const formData = new FormData()
    formData.append("file", file)
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100
        props.setState("uploadProgress", progress)
      }
    })
    
    const uploadPromise = new Promise<void>((resolve, reject) => {
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText)
          finalizeFileSource(result.filePath, result.fileName, result.duration)
          resolve()
        } else {
          reject(new Error("Upload failed"))
        }
      })
      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"))
      })
      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"))
      })
      xhr.open("POST", "/api/download/upload")
      xhr.send(formData)
    })
    
    await uploadPromise
  }

  const handleFileChange = async (file: globalThis.File | null): Promise<void> => {
    props.setState("selectedFile", file)
    if (!file) return
    props.setState("isUploading", true)
    props.setState("uploadError", "")
    props.setState("uploadedFilePath", "")
    props.setState("uploadedFileName", "")
    props.setState("uploadProgress", 0)
    
    if (file.size > 100 * 1024 * 1024) {
      setUploadMode('chunked')
    } else {
      setUploadMode('small')
    }
    
    try {
      if (file.size > 100 * 1024 * 1024) {
        await uploadFileChunked(file)
      } else {
        await uploadFileSimple(file)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file"
      props.setState("uploadError", errorMessage)
      props.setState("selectedFile", null)
      props.setState("uploadProgress", 0)
      err('File upload failed', error)
    } finally {
      props.setState("isUploading", false)
    }
  }

  const onFileInputChange = (e: Event): void => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      handleFileChange(file)
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
    <div class={s.sourceColumn}>
      <div class={s.formGroup}>
        <label for="fileUpload" class={shared.label}>
          Upload File (Audio, Video, or Document)
        </label>
        <div class={s.fileUploadContainer}>
          <input 
            id="fileUpload"
            type="file"
            accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.mov,.avi,.mkv,.flac,.ogg,.pdf,.png,.jpg,.jpeg,.tiff,.tif,.txt,.docx,application/pdf,image/png,image/jpeg,image/tiff,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={onFileInputChange}
            disabled={props.disabled}
            class={s.fileInput}
          />
          <Show when={props.state.selectedFile}>
            <div class={s.fileInfo}>
              <span class={s.fileName}>{props.state.selectedFile?.name}</span>
              <span class={s.fileSize}>
                {formatBytes(props.state.selectedFile?.size || 0)}
              </span>
              <Show when={uploadMode() === 'chunked'}>
                <span class={s.uploadMode}>Chunked upload</span>
              </Show>
            </div>
            <Show when={props.state.uploadProgress > 0 && props.state.uploadProgress < 100}>
              <div class={s.progressContainer}>
                <div class={s.progressBar} style={{ width: `${props.state.uploadProgress}%` }} />
                <span class={s.progressText}>{props.state.uploadProgress.toFixed(1)}%</span>
              </div>
            </Show>
          </Show>
        </div>
        <p class={shared.helpText}>
          Supports audio, video, PDF, DOCX, and PPTX. Files over 100MB use chunked upload.
        </p>
      </div>
    </div>
  )
}

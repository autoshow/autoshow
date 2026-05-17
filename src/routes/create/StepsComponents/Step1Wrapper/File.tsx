import clsx from "clsx"
import { Show,createSignal } from "solid-js"
import {
getDefaultDocumentModel,
getDefaultDocumentService,
getDocumentTypeFromExtension,
isDocumentExtension,
resolveDocumentRuntimeCapabilities
} from "~/models"
import type { SourceRoutesCreateStepsComponentsStep1WrapperFileProps as Props } from '~/types'
import shared from "../shared/shared.module.css"
import s from "./File.module.css"
import { selectPreferredFileUploadMode,shouldFallbackToChunkedUpload,type FileUploadMode } from './file-upload-mode'
import { SUPPORTED_FILE_ACCEPT } from './supported-file-accept'

const CHUNK_SIZE = 5 * 1024 * 1024

export default function File(props: Props) {
  const [uploadMode, setUploadMode] = createSignal<FileUploadMode>('small')

  const finalizeFileSource = (uploadId: string, fileName: string, fileSize: number, duration?: number) => {
    const isDocument = isDocumentExtension(fileName)
    if (isDocument) {
      const documentType = getDocumentTypeFromExtension(fileName)
      const runtimeCapabilities = resolveDocumentRuntimeCapabilities(props.documentRuntimeCapabilities)
      const defaultService = getDefaultDocumentService(documentType ?? undefined, runtimeCapabilities)
      props.setState({
        uploadId,
        uploadedFileName: fileName,
        uploadedFileSize: fileSize,
        uploadedFileDuration: undefined,
        sourceOrigin: "local-upload",
        uploadProgress: 100,
        urlValue: "",
        urlMetadata: null,
        urlVerified: false,
        transcriptionOption: "",
        transcriptionModel: "",
        documentService: defaultService,
        documentModel: getDefaultDocumentModel(defaultService, documentType ?? undefined, runtimeCapabilities)
      })
    } else {
      props.setState({
        uploadId,
        uploadedFileName: fileName,
        uploadedFileSize: fileSize,
        uploadedFileDuration: duration,
        sourceOrigin: "local-upload",
        uploadProgress: 100,
        urlValue: "",
        urlMetadata: null,
        urlVerified: false,
        transcriptionOption: "",
        transcriptionModel: ""
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
        finalizeFileSource(result.uploadId, result.fileName, result.fileSize, result.duration)
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
      const cleanup = () => {
        xhr.removeEventListener("load", onLoad)
        xhr.removeEventListener("error", onError)
        xhr.removeEventListener("abort", onAbort)
      }
      const onLoad = () => {
        cleanup()
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText)
          finalizeFileSource(result.uploadId, result.fileName, result.fileSize, result.duration)
          resolve()
        } else {
          reject(new Error("Upload failed"))
        }
      }
      const onError = () => {
        cleanup()
        reject(new Error("Upload failed"))
      }
      const onAbort = () => {
        cleanup()
        reject(new Error("Upload aborted"))
      }
      xhr.addEventListener("load", onLoad)
      xhr.addEventListener("error", onError)
      xhr.addEventListener("abort", onAbort)
      xhr.open("POST", "/api/download/upload")
      xhr.send(formData)
    })

    await uploadPromise
  }

  const uploadFileDirect = async (file: globalThis.File): Promise<boolean> => {
    const contentType = file.type || "application/octet-stream"
    const createResponse = await fetch("/api/download/upload-url", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        contentType
      })
    })

    const createResult = await createResponse.json().catch(() => ({}))
    if (!createResponse.ok) {
      if (shouldFallbackToChunkedUpload(createResponse.status)) {
        return false
      }
      throw new Error(createResult.error || "Failed to prepare upload")
    }

    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const progress = Math.min(95, (e.loaded / e.total) * 95)
        props.setState("uploadProgress", progress)
      }
    })

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        xhr.removeEventListener("load", onLoad)
        xhr.removeEventListener("error", onError)
        xhr.removeEventListener("abort", onAbort)
      }
      const onLoad = () => {
        cleanup()
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error("Direct upload failed"))
        }
      }
      const onError = () => {
        cleanup()
        reject(new Error("Direct upload failed"))
      }
      const onAbort = () => {
        cleanup()
        reject(new Error("Direct upload aborted"))
      }
      xhr.addEventListener("load", onLoad)
      xhr.addEventListener("error", onError)
      xhr.addEventListener("abort", onAbort)
      xhr.open("PUT", createResult.uploadUrl)
      xhr.setRequestHeader("content-type", contentType)
      xhr.send(file)
    })

    props.setState("uploadProgress", 97)

    const completeResponse = await fetch("/api/download/complete-upload", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        uploadSessionId: createResult.uploadSessionId,
        objectKey: createResult.objectKey,
        fileName: file.name,
        fileSize: file.size
      })
    })
    const completeResult = await completeResponse.json().catch(() => ({}))
    if (!completeResponse.ok) {
      throw new Error(completeResult.error || "Failed to complete upload")
    }

    finalizeFileSource(completeResult.uploadId, completeResult.fileName, completeResult.fileSize, completeResult.duration)
    return true
  }

  const handleFileChange = async (file: globalThis.File | null): Promise<void> => {
    props.setState("selectedFile", file)
    if (!file) return
    props.setState("isUploading", true)
    props.setState("uploadError", "")
    props.setState("uploadId", "")
    props.setState("uploadedFileName", "")
    props.setState("uploadedFileSize", undefined)
    props.setState("uploadProgress", 0)
    props.setState("sourceOrigin", null)

    const preferredUploadMode = selectPreferredFileUploadMode(file.size)
    setUploadMode(preferredUploadMode)

    try {
      if (preferredUploadMode === 'small') {
        await uploadFileSimple(file)
      } else {
        const directUploadCompleted = await uploadFileDirect(file)
        if (!directUploadCompleted) {
          setUploadMode('chunked')
          props.setState("uploadProgress", 0)
          await uploadFileChunked(file)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file"
      props.setState("uploadError", errorMessage)
      props.setState("selectedFile", null)
      props.setState("uploadProgress", 0)
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
    <div class={clsx(shared.sourcePanel, s.sourcePanelFile)}>
      <div>
        <label for="fileUpload" class={shared.label}>
          Upload File (Audio, Video, Document, or Image)
        </label>
        <div class={s.fileUploadContainer}>
          <input
            id="fileUpload"
            type="file"
            accept={SUPPORTED_FILE_ACCEPT}
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
              <Show when={uploadMode() !== 'small'}>
                <span class={s.uploadMode}>{uploadMode() === 'direct' ? 'Direct upload' : 'Chunked upload'}</span>
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
        <ul class={s.exampleList}>
          <li><span class={s.exampleName}>podcast-episode.mp3</span><span class={s.exampleDesc}>MP3, WAV, M4A, FLAC, OGG, AAC, WMA, MPEG/MPGA</span></li>
          <li><span class={s.exampleName}>meeting-recording.mp4</span><span class={s.exampleDesc}>MP4, MOV, AVI, MKV, WEBM, WMV, FLV, M4V</span></li>
          <li><span class={s.exampleName}>research-paper.pdf</span><span class={s.exampleDesc}>PDF, DOCX, PPTX, XLSX, TXT document</span></li>
          <li><span class={s.exampleName}>screenshot.png</span><span class={s.exampleDesc}>PNG, JPG/JPEG, TIFF/TIF image</span></li>
        </ul>
      </div>
    </div>
  )
}

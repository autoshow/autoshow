import clsx from "clsx"
import { Show,createSignal } from "solid-js"
import {
getDefaultDocumentModel,
getDefaultDocumentService,
getDocumentTypeFromExtension,
isDocumentExtension,
resolveDocumentRuntimeCapabilities
} from "~/models"
import type { StepsProps } from "~/types"
import shared from "../shared/shared.module.css"
import s from "./GoogleDrive.module.css"

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file"
const GIS_SCRIPT_ID = "google-identity-services-script"
const GAPI_SCRIPT_ID = "google-api-script"

const PICKER_MIME_TYPES = [
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
  "application/vnd.google-apps.drawing",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/flac",
  "audio/ogg",
  "audio/aac",
  "audio/x-ms-wma",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  "video/x-ms-wmv",
  "video/x-flv",
  "video/x-m4v",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/tiff",
].join(",")

type Props = {
  state: StepsProps["state"]
  setState: StepsProps["setState"]
  documentRuntimeCapabilities: StepsProps["documentRuntimeCapabilities"]
  disabled: boolean | undefined
}

type GoogleTokenResponse = {
  access_token?: string
  error?: string
}

type GoogleTokenClient = {
  requestAccessToken: () => void
}

type GooglePickerDocument = Record<string, unknown>

type GooglePickerCallbackData = Record<string, unknown>

type GooglePickerInstance = {
  setVisible: (visible: boolean) => void
}

type GooglePickerView = {
  setMimeTypes: (mimeTypes: string) => GooglePickerView
  setIncludeFolders: (includeFolders: boolean) => GooglePickerView
  setSelectFolderEnabled: (enabled: boolean) => GooglePickerView
}

type GooglePickerBuilder = {
  setDeveloperKey: (apiKey: string) => GooglePickerBuilder
  setOAuthToken: (token: string) => GooglePickerBuilder
  addView: (view: GooglePickerView) => GooglePickerBuilder
  enableFeature: (feature: string) => GooglePickerBuilder
  setCallback: (callback: (data: GooglePickerCallbackData) => void) => GooglePickerBuilder
  build: () => GooglePickerInstance
}

type GooglePickerNamespace = {
  Action: { PICKED: string; CANCEL: string }
  Response: { DOCUMENTS: string }
  Document: { ID: string; NAME: string; MIME_TYPE: string; RESOURCE_KEY: string }
  ViewId: { DOCS: string }
  Feature: { SUPPORT_DRIVES: string }
  DocsView: new (viewId: string) => GooglePickerView
  PickerBuilder: new () => GooglePickerBuilder
}

type GoogleApiNamespace = {
  load: (apiName: string, options: { callback: () => void; onerror?: () => void }) => void
}

declare global {
  interface Window {
    gapi?: GoogleApiNamespace
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string
            scope: string
            callback: (response: GoogleTokenResponse) => void
            error_callback?: (error: unknown) => void
          }) => GoogleTokenClient
        }
      }
      picker?: GooglePickerNamespace
    }
  }
}

const clientId = (): string => import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID?.trim() ?? ""
const apiKey = (): string => import.meta.env.VITE_GOOGLE_DRIVE_API_KEY?.trim() ?? ""

const isConfigured = (): boolean => clientId().length > 0 && apiKey().length > 0

const loadScript = (src: string, id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null
    if (existing?.dataset.loaded === "true") {
      resolve()
      return
    }

    const script = existing ?? document.createElement("script")
    const onLoad = () => {
      script.dataset.loaded = "true"
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error("Failed to load Google Drive picker"))
    }
    const cleanup = () => {
      script.removeEventListener("load", onLoad)
      script.removeEventListener("error", onError)
    }

    script.addEventListener("load", onLoad)
    script.addEventListener("error", onError)

    if (!existing) {
      script.id = id
      script.src = src
      script.async = true
      script.defer = true
      document.head.append(script)
    }
  })
}

const loadGoogleLibraries = async (): Promise<void> => {
  await Promise.all([
    loadScript("https://accounts.google.com/gsi/client", GIS_SCRIPT_ID),
    loadScript("https://apis.google.com/js/api.js", GAPI_SCRIPT_ID),
  ])

  if (!window.gapi) {
    throw new Error("Google API client did not load")
  }

  await new Promise<void>((resolve, reject) => {
    window.gapi!.load("picker", {
      callback: resolve,
      onerror: () => reject(new Error("Google Picker did not load")),
    })
  })
}

const requestDriveAccessToken = async (): Promise<string> => {
  await loadGoogleLibraries()

  const oauth = window.google?.accounts?.oauth2
  if (!oauth) {
    throw new Error("Google Identity Services did not load")
  }

  return await new Promise<string>((resolve, reject) => {
    const tokenClient = oauth.initTokenClient({
      client_id: clientId(),
      scope: DRIVE_FILE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error("Google Drive authorization failed"))
          return
        }
        resolve(response.access_token)
      },
      error_callback: () => reject(new Error("Google Drive authorization failed")),
    })
    tokenClient.requestAccessToken()
  })
}

const readPickerString = (
  doc: GooglePickerDocument,
  key: string
): string | undefined => {
  const value = doc[key]
  return typeof value === "string" && value.trim() ? value : undefined
}

const pickGoogleDriveFile = async (accessToken: string): Promise<GooglePickerDocument | null> => {
  const picker = window.google?.picker
  if (!picker) {
    throw new Error("Google Picker did not load")
  }

  return await new Promise<GooglePickerDocument | null>((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCS)
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false)
      .setMimeTypes(PICKER_MIME_TYPES)

    const pickerInstance = new picker.PickerBuilder()
      .setDeveloperKey(apiKey())
      .setOAuthToken(accessToken)
      .addView(view)
      .enableFeature(picker.Feature.SUPPORT_DRIVES)
      .setCallback((data) => {
        if (data.action === picker.Action.CANCEL) {
          resolve(null)
          return
        }
        if (data.action !== picker.Action.PICKED) {
          return
        }

        const docs = data[picker.Response.DOCUMENTS]
        const firstDoc = Array.isArray(docs) ? docs[0] : undefined
        resolve(firstDoc && typeof firstDoc === "object" ? firstDoc as GooglePickerDocument : null)
      })
      .build()

    pickerInstance.setVisible(true)
  })
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

export default function GoogleDrive(props: Props) {
  const [isPicking, setIsPicking] = createSignal(false)

  const finalizeDriveSource = (
    uploadId: string,
    fileName: string,
    fileSize: number,
    duration?: number
  ): void => {
    const isDocument = isDocumentExtension(fileName)
    if (isDocument) {
      const documentType = getDocumentTypeFromExtension(fileName)
      const runtimeCapabilities = resolveDocumentRuntimeCapabilities(props.documentRuntimeCapabilities)
      const defaultService = getDefaultDocumentService(documentType ?? undefined, runtimeCapabilities)
      props.setState({
        selectedFile: null,
        uploadId,
        uploadedFileName: fileName,
        uploadedFileSize: fileSize,
        uploadedFileDuration: undefined,
        sourceOrigin: "google-drive",
        uploadProgress: 100,
        urlValue: "",
        urlMetadata: null,
        urlVerified: false,
        transcriptionOption: "",
        transcriptionModel: "",
        documentService: defaultService,
        documentModel: getDefaultDocumentModel(defaultService, documentType ?? undefined, runtimeCapabilities)
      })
      return
    }

    props.setState({
      selectedFile: null,
      uploadId,
      uploadedFileName: fileName,
      uploadedFileSize: fileSize,
      uploadedFileDuration: duration,
      sourceOrigin: "google-drive",
      uploadProgress: 100,
      urlValue: "",
      urlMetadata: null,
      urlVerified: false,
      transcriptionOption: "",
      transcriptionModel: ""
    })
  }

  const importSelectedDriveFile = async (): Promise<void> => {
    if (!isConfigured() || props.disabled || isPicking()) return

    setIsPicking(true)
    props.setState({
      selectedFile: null,
      isUploading: true,
      uploadError: "",
      uploadId: "",
      uploadedFileName: "",
      uploadedFileSize: undefined,
      uploadedFileDuration: undefined,
      sourceOrigin: null,
      uploadProgress: 5,
    })

    try {
      const accessToken = await requestDriveAccessToken()
      props.setState("uploadProgress", 30)

      const doc = await pickGoogleDriveFile(accessToken)
      if (!doc) {
        props.setState("uploadProgress", 0)
        return
      }

      const picker = window.google!.picker!
      const fileId = readPickerString(doc, picker.Document.ID)
      if (!fileId) {
        throw new Error("Google Drive file selection was incomplete")
      }

      props.setState("uploadProgress", 60)

      const response = await fetch("/api/download/google-drive/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          name: readPickerString(doc, picker.Document.NAME),
          mimeType: readPickerString(doc, picker.Document.MIME_TYPE),
          resourceKey: readPickerString(doc, picker.Document.RESOURCE_KEY),
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Google Drive import failed")
      }

      finalizeDriveSource(result.uploadId, result.fileName, result.fileSize, result.duration)
    } catch (error) {
      props.setState({
        uploadError: error instanceof Error ? error.message : "Google Drive import failed",
        selectedFile: null,
        uploadId: "",
        uploadedFileName: "",
        uploadedFileSize: undefined,
        uploadedFileDuration: undefined,
        sourceOrigin: null,
        uploadProgress: 0,
      })
    } finally {
      props.setState("isUploading", false)
      setIsPicking(false)
    }
  }

  return (
    <div class={clsx(shared.sourcePanel, s.sourcePanelDrive)}>
      <div>
        <label class={shared.label}>
          Google Drive
        </label>
        <p class={clsx(shared.helpText, s.driveHelpText)}>
          Import one supported file from Drive.
        </p>
        <div class={s.driveActions}>
          <button
            type="button"
            class={s.driveButton}
            disabled={props.disabled || isPicking() || !isConfigured()}
            onClick={() => void importSelectedDriveFile()}
          >
            {isPicking() ? "Opening Drive..." : "Choose from Drive"}
          </button>

          <Show when={!isConfigured()}>
            <div class={s.configMessage}>
              Google Drive credentials are not configured.
            </div>
          </Show>

          <Show when={props.state.sourceOrigin === "google-drive" && props.state.uploadedFileName}>
            <div class={s.driveInfo}>
              <span class={s.driveFileName}>{props.state.uploadedFileName}</span>
              <Show when={props.state.uploadedFileSize !== undefined}>
                <span class={s.driveFileSize}>{formatBytes(props.state.uploadedFileSize!)}</span>
              </Show>
            </div>
          </Show>

          <Show when={isPicking() && props.state.uploadProgress > 0 && props.state.uploadProgress < 100}>
            <div class={s.progressContainer}>
              <div class={s.progressBar} style={{ width: `${props.state.uploadProgress}%` }} />
              <span class={s.progressText}>{props.state.uploadProgress.toFixed(0)}%</span>
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}

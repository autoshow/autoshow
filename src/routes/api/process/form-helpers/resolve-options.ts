import {
getDefaultDocumentModel,
getDefaultDocumentService,
getDocumentTypeFromExtension,
getServerDocumentRuntimeCapabilities,
isDocumentExtension
} from '~/models'
import type {
DocumentExtractionModel,
DocumentExtractionServiceType,SourceRoutesApiProcessFormHelpersResolveOptionsFeatureFlags as FeatureFlags,ProcessingFormData,
ResolvedUploadSource,SupportedDocumentType,TTSServiceType
} from '~/types'
import { parseCommaSeparated } from './options-shared'

const getDocumentTypeFromUrl = (url: string): ReturnType<typeof getDocumentTypeFromExtension> => {
  try {
    const pathname = new URL(url).pathname
    return getDocumentTypeFromExtension(pathname)
  } catch {
    return getDocumentTypeFromExtension(url)
  }
}

const resolveDocumentOptionsInline = (
  urlType: string | undefined,
  uploadFileName: string | undefined,
  documentServiceInput: string | undefined,
  documentModel: string | undefined,
  documentTypeString: string | undefined,
  disableDocumentCacheString: string | undefined,
  url?: string | undefined
) => {
  const hasUploadedFile = !!uploadFileName
  const isDocumentUrl = urlType === 'document'
  const isDocumentFile = !!(hasUploadedFile && uploadFileName && isDocumentExtension(uploadFileName))
  const isDocument = isDocumentUrl || isDocumentFile
  const disableDocumentCache = disableDocumentCacheString === 'true'
  const resolvedDocumentType = isDocument
    ? (documentTypeString || (uploadFileName ? getDocumentTypeFromExtension(uploadFileName) : null) || (url ? getDocumentTypeFromUrl(url) : null))
    : undefined
  const runtimeCapabilities = isDocument ? getServerDocumentRuntimeCapabilities() : undefined

  const resolvedDocumentService = isDocument
    ? ((documentServiceInput || getDefaultDocumentService(
      resolvedDocumentType as SupportedDocumentType | undefined,
      runtimeCapabilities
    )) as DocumentExtractionServiceType)
    : undefined
  const resolvedDocumentModel: DocumentExtractionModel | undefined = isDocument
    ? ((documentModel || (resolvedDocumentService
      ? getDefaultDocumentModel(
        resolvedDocumentService,
        resolvedDocumentType as SupportedDocumentType | undefined,
        runtimeCapabilities
      )
      : undefined)) as DocumentExtractionModel | undefined)
    : undefined

  return {
    isDocument,
    isDocumentUrl,
    disableDocumentCache,
    resolvedDocumentService,
    resolvedDocumentModel,
    resolvedDocumentType
  }
}

export const resolveSourceOptions = (
  form: ProcessingFormData,
  resolvedUpload?: ResolvedUploadSource
) => {
  const hasUrl = form.url?.trim() && form.urlType

  const {
    isDocument,
    isDocumentUrl,
    disableDocumentCache,
    resolvedDocumentService,
    resolvedDocumentModel,
    resolvedDocumentType
  } = resolveDocumentOptionsInline(
    form.urlType,
    resolvedUpload?.localFileName,
    form.documentService,
    form.documentModel,
    form.documentType,
    form.disableDocumentCache,
    form.url
  )

  if (hasUrl) {
    return {
      url: form.url!,
      uploadId: undefined,
      isLocalFile: false,
      localFilePath: undefined,
      localFileName: undefined,
      urlType: form.urlType as 'youtube' | 'streaming' | 'direct-file' | 'document',
      urlDuration: form.urlDuration ? parseFloat(form.urlDuration) : undefined,
      urlFileSize: form.urlFileSize ? parseFloat(form.urlFileSize) : undefined,
      useResilientDownload: form.urlType === 'direct-file',
      documentUrl: isDocumentUrl ? form.url : undefined,
      inputType: isDocument ? 'document' as const : 'audio-video' as const,
      disableDocumentCache,
      documentPageCount: form.documentPageCount ? parseInt(form.documentPageCount, 10) : undefined,
      documentService: isDocument ? resolvedDocumentService : undefined,
      documentModel: isDocument ? resolvedDocumentModel : undefined,
      documentType: isDocument ? resolvedDocumentType as SupportedDocumentType | undefined : undefined
    }
  }

  if (form.uploadId && !resolvedUpload) {
    throw new Error('uploadId requires resolved upload metadata')
  }

  return {
    url: resolvedUpload?.localFilePath ? `file://${resolvedUpload.localFilePath}` : 'file://pending-upload',
    uploadId: resolvedUpload?.uploadId,
    isLocalFile: true,
    localFilePath: resolvedUpload?.localFilePath,
    localFileName: resolvedUpload?.localFileName,
    urlType: undefined,
    urlDuration: form.urlDuration ? parseFloat(form.urlDuration) : resolvedUpload?.localFileDuration,
    urlFileSize: undefined,
    useResilientDownload: false,
    documentUrl: undefined,
    inputType: isDocument ? 'document' as const : 'audio-video' as const,
    disableDocumentCache,
    documentPageCount: form.documentPageCount ? parseInt(form.documentPageCount, 10) : undefined,
    documentService: isDocument ? resolvedDocumentService : undefined,
    documentModel: isDocument ? resolvedDocumentModel : undefined,
    documentType: isDocument ? resolvedDocumentType as SupportedDocumentType | undefined : undefined
  }
}

const parseOptionalInt = (value: string | undefined): number | undefined => {
  if (!value) return undefined
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

const resolveTtsOptions = (form: ProcessingFormData, features: FeatureFlags) => ({
  ttsService: features.ttsEnabled && form.ttsService ? form.ttsService as TTSServiceType : undefined,
  ttsVoice: features.ttsEnabled && form.ttsVoice ? form.ttsVoice : undefined,
  ttsModel: features.ttsEnabled && form.ttsModel ? form.ttsModel : undefined,
})

const resolveImageOptions = (form: ProcessingFormData, features: FeatureFlags) => ({
  imageService: features.imageGenEnabled && form.imageService ? form.imageService : undefined,
  imageModel: features.imageGenEnabled && form.imageModel ? form.imageModel : undefined,
  imageDimensionOrRatio: features.imageGenEnabled && form.imageDimensionOrRatio ? form.imageDimensionOrRatio : undefined,
  selectedImagePrompts: features.imageGenEnabled ? parseCommaSeparated(form.selectedImagePrompts) : undefined,
})

const resolveMusicOptions = (form: ProcessingFormData, features: FeatureFlags) => ({
  musicService: features.musicGenEnabled && form.musicService ? form.musicService : undefined,
  musicModel: features.musicGenEnabled && form.musicModel ? form.musicModel : undefined,
  selectedMusicGenre: features.musicGenEnabled && form.selectedMusicGenre
    ? form.selectedMusicGenre as 'rap' | 'rock' | 'pop' | 'country' | 'folk' | 'jazz' | 'electronic'
    : undefined,
  musicPreset: features.musicGenEnabled && form.musicPreset ? form.musicPreset : undefined,
  musicDurationSeconds: features.musicGenEnabled ? parseOptionalInt(form.musicDurationSeconds) : undefined,
  musicInstrumental: features.musicGenEnabled && form.musicInstrumental
    ? form.musicInstrumental === 'true'
    : undefined,
  musicSampleRate: features.musicGenEnabled
    ? parseOptionalInt(form.musicSampleRate) as 16000 | 24000 | 32000 | 44100 | undefined
    : undefined,
  musicBitrate: features.musicGenEnabled
    ? parseOptionalInt(form.musicBitrate) as 32000 | 64000 | 128000 | 256000 | undefined
    : undefined,
})

const resolveVideoOptions = (form: ProcessingFormData, features: FeatureFlags) => ({
  videoService: features.videoGenEnabled && form.videoService ? form.videoService : undefined,
  videoModel: features.videoGenEnabled && form.videoModel ? form.videoModel : undefined,
  videoSize: features.videoGenEnabled && form.videoSize ? form.videoSize : undefined,
  videoDuration: features.videoGenEnabled ? parseOptionalInt(form.videoDuration) : undefined,
  videoAspectRatio: features.videoGenEnabled && form.videoAspectRatio ? form.videoAspectRatio : undefined,
  selectedVideoPrompts: features.videoGenEnabled
    ? parseCommaSeparated(form.selectedVideoPrompts) as ('explainer' | 'highlight' | 'intro' | 'outro' | 'social')[]
    : undefined
})

export const resolveMediaOptions = (form: ProcessingFormData, features: FeatureFlags) => {
  return {
    ...resolveTtsOptions(form, features),
    ...resolveImageOptions(form, features),
    ...resolveMusicOptions(form, features),
    ...resolveVideoOptions(form, features),
  }
}

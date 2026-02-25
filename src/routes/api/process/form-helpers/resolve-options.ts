import type { ProcessingFormData, DocumentExtractionModel } from '~/types'
import { isDocumentExtension, getDocumentTypeFromExtension, getDefaultDocumentModel, getDefaultDocumentService } from '~/models'

export const resolveFeatureFlags = (form: ProcessingFormData) => ({
  ttsEnabled: form.ttsEnabled === 'true',
  imageGenEnabled: form.imageGenEnabled === 'true',
  musicGenEnabled: form.musicGenSkipped !== 'true',
  videoGenEnabled: form.videoGenEnabled === 'true'
})

export type FeatureFlags = ReturnType<typeof resolveFeatureFlags>

export const resolveDocumentOptionsInline = (
  urlType: string | undefined,
  uploadedFilePath: string | undefined,
  uploadedFileName: string | undefined,
  documentServiceInput: string | undefined,
  documentModel: string | undefined,
  documentTypeString: string | undefined,
  disableDocumentCacheString: string | undefined
) => {
  const hasUploadedFile = uploadedFilePath && uploadedFileName
  const isDocumentUrl = urlType === 'document'
  const isDocumentFile = !!(hasUploadedFile && uploadedFileName && isDocumentExtension(uploadedFileName))
  const isDocument = isDocumentUrl || isDocumentFile
  const disableDocumentCache = disableDocumentCacheString === 'true'

  const resolvedDocumentService = isDocument
    ? ((documentServiceInput || getDefaultDocumentService()) as 'llamaparse' | 'mistral-ocr')
    : undefined
  const resolvedDocumentModel: DocumentExtractionModel | undefined = isDocument
    ? ((documentModel || (resolvedDocumentService ? getDefaultDocumentModel(resolvedDocumentService) : undefined)) as DocumentExtractionModel | undefined)
    : undefined
  const resolvedDocumentType = isDocument
    ? (documentTypeString || (uploadedFileName ? getDocumentTypeFromExtension(uploadedFileName) : null))
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

export const resolveSourceOptions = (form: ProcessingFormData) => {
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
    form.uploadedFilePath,
    form.uploadedFileName,
    form.documentService,
    form.documentModel,
    form.documentType,
    form.disableDocumentCache
  )

  if (hasUrl) {
    return {
      url: form.url!,
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
      documentService: isDocument ? resolvedDocumentService : undefined,
      documentModel: isDocument ? resolvedDocumentModel : undefined,
      documentType: isDocument ? resolvedDocumentType as 'pdf' | 'png' | 'jpg' | 'tiff' | 'txt' | 'docx' | undefined : undefined
    }
  }

  return {
    url: `file://${form.uploadedFilePath}`,
    isLocalFile: true,
    localFilePath: form.uploadedFilePath,
    localFileName: form.uploadedFileName,
    urlType: undefined,
    urlDuration: undefined,
    urlFileSize: undefined,
    useResilientDownload: false,
    documentUrl: undefined,
    inputType: isDocument ? 'document' as const : 'audio-video' as const,
    disableDocumentCache,
    documentService: isDocument ? resolvedDocumentService : undefined,
    documentModel: isDocument ? resolvedDocumentModel : undefined,
    documentType: isDocument ? resolvedDocumentType as 'pdf' | 'png' | 'jpg' | 'tiff' | 'txt' | 'docx' | undefined : undefined
  }
}

const parseCommaSeparated = (value: string | undefined): string[] => {
  return value ? value.split(',').filter(p => p.length > 0) : []
}

export const resolveMediaOptions = (form: ProcessingFormData, features: FeatureFlags) => {
  const parsedMusicDurationSeconds = features.musicGenEnabled && form.musicDurationSeconds ? parseInt(form.musicDurationSeconds) : undefined
  const parsedMusicSampleRate = features.musicGenEnabled && form.musicSampleRate ? parseInt(form.musicSampleRate) : undefined
  const parsedMusicBitrate = features.musicGenEnabled && form.musicBitrate ? parseInt(form.musicBitrate) : undefined

  return {
    ttsService: features.ttsEnabled && form.ttsService ? form.ttsService as 'openai' | 'elevenlabs' | 'groq' : undefined,
    ttsVoice: features.ttsEnabled && form.ttsVoice ? form.ttsVoice : undefined,
    ttsModel: features.ttsEnabled && form.ttsModel ? form.ttsModel : undefined,

    imageService: features.imageGenEnabled && form.imageService ? form.imageService : undefined,
    imageModel: features.imageGenEnabled && form.imageModel ? form.imageModel : undefined,
    imageDimensionOrRatio: features.imageGenEnabled && form.imageDimensionOrRatio ? form.imageDimensionOrRatio : undefined,
    selectedImagePrompts: features.imageGenEnabled ? parseCommaSeparated(form.selectedImagePrompts) : undefined,

    musicService: features.musicGenEnabled && form.musicService ? form.musicService : undefined,
    musicModel: features.musicGenEnabled && form.musicModel ? form.musicModel : undefined,
    selectedMusicGenre: features.musicGenEnabled && form.selectedMusicGenre
      ? form.selectedMusicGenre as 'rap' | 'rock' | 'pop' | 'country' | 'folk' | 'jazz' | 'electronic'
      : undefined,
    musicPreset: features.musicGenEnabled && form.musicPreset ? form.musicPreset : undefined,
    musicDurationSeconds: parsedMusicDurationSeconds,
    musicInstrumental: features.musicGenEnabled && form.musicInstrumental
      ? form.musicInstrumental === 'true'
      : undefined,
    musicSampleRate: parsedMusicSampleRate as 16000 | 24000 | 32000 | 44100 | undefined,
    musicBitrate: parsedMusicBitrate as 32000 | 64000 | 128000 | 256000 | undefined,

    videoService: features.videoGenEnabled && form.videoService ? form.videoService : undefined,
    videoModel: features.videoGenEnabled && form.videoModel ? form.videoModel : undefined,
    videoSize: features.videoGenEnabled && form.videoSize ? form.videoSize : undefined,
    videoDuration: features.videoGenEnabled && form.videoDuration ? parseInt(form.videoDuration) : undefined,
    videoAspectRatio: features.videoGenEnabled && form.videoAspectRatio ? form.videoAspectRatio : undefined,
    selectedVideoPrompts: features.videoGenEnabled
      ? parseCommaSeparated(form.selectedVideoPrompts) as ('explainer' | 'highlight' | 'intro' | 'outro' | 'social')[]
      : undefined
  }
}

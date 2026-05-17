import * as v from 'valibot'
import { getDefaultTranscriptionModelForService } from '~/models'
import { estimateCostBreakdown } from '~/utils/cost/cost-estimation'
import type {
AppendAssetsFormData,
ProcessingFormData,
ProcessingOptions,
ShowNote,
Step4Metadata,
Step5Metadata,
Step6Metadata,
Step7Metadata,
Step8Metadata
} from '~/types'
import { AppendAssetsFormDataSchema } from '~/types'
import { buildProcessingOptions } from './build-options'

const APPEND_ASSETS_FORBIDDEN_FIELDS = [
  'url',
  'uploadId',
  'urlType',
  'urlDuration',
  'urlFileSize',
  'transcriptionOption',
  'transcriptionModel',
  'inputType',
  'documentService',
  'documentModel',
  'documentType',
  'documentPageCount',
  'disableDocumentCache',
] as const

const APPEND_ASSETS_ALLOWED_FIELDS = new Set([
  'llmEnabled',
  'llmService',
  'llmModel',
  'selectedPrompts',
  'llmCustomInstructions',
  'ttsEnabled',
  'ttsService',
  'ttsVoice',
  'ttsModel',
  'imageGenEnabled',
  'imageService',
  'imageModel',
  'imageDimensionOrRatio',
  'selectedImagePrompts',
  'imageCustomInstructions',
  'musicGenEnabled',
  'musicService',
  'musicModel',
  'selectedMusicGenre',
  'musicPreset',
  'musicDurationSeconds',
  'musicInstrumental',
  'musicSampleRate',
  'musicBitrate',
  'musicCustomInstructions',
  'videoGenEnabled',
  'videoService',
  'selectedVideoPrompts',
  'videoModel',
  'videoSize',
  'videoDuration',
  'videoAspectRatio',
  'videoCustomInstructions',
])

const DEFAULT_TRANSCRIPTION_SERVICE = 'groq' as const

export type AppendAssetsMetadata = {
  llm?: Step4Metadata | undefined
  tts?: Step5Metadata | undefined
  image?: Step6Metadata | undefined
  music?: Step7Metadata | undefined
  video?: Step8Metadata | undefined
}

export const getAppendAssetsFieldError = (rawInput: Record<string, unknown>): string | null => {
  for (const field of APPEND_ASSETS_FORBIDDEN_FIELDS) {
    const value = rawInput[field]
    if (value == null) continue
    if (typeof value === 'string' && value.length === 0) continue
    return `${field} is not accepted when appending assets`
  }

  for (const field of Object.keys(rawInput)) {
    if (!APPEND_ASSETS_ALLOWED_FIELDS.has(field)) {
      return `${field} is not accepted when appending assets`
    }
  }

  return null
}

export const parseAppendAssetsFormData = (formData: FormData) => {
  const rawFormData: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      if (value.length === 0) {
        continue
      }
      rawFormData[key] = value
    }
  }

  const fieldError = getAppendAssetsFieldError(rawFormData)
  if (fieldError) {
    return { success: false as const, fieldError }
  }

  return v.safeParse(AppendAssetsFormDataSchema, rawFormData)
}

export const parseAppendAssetsJson = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return v.safeParse(AppendAssetsFormDataSchema, body)
  }

  const fieldError = getAppendAssetsFieldError(body as Record<string, unknown>)
  if (fieldError) {
    return { success: false as const, fieldError }
  }

  return v.safeParse(AppendAssetsFormDataSchema, body)
}

const parseStoredDurationSeconds = (duration: string | null | undefined): number | undefined => {
  if (!duration) return undefined

  const trimmed = duration.trim()
  if (!trimmed) return undefined

  const numeric = Number(trimmed)
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric
  }

  const parts = trimmed.split(':').map(part => Number(part))
  if (parts.length >= 2 && parts.length <= 3 && parts.every(part => Number.isFinite(part) && part >= 0)) {
    return parts.reduce((total, part) => (total * 60) + part, 0)
  }

  return undefined
}

const toProcessingFormData = (form: AppendAssetsFormData, note: ShowNote): ProcessingFormData => {
  const transcriptionService = note.transcription_service ?? DEFAULT_TRANSCRIPTION_SERVICE

  return {
    ...form,
    url: note.url,
    urlType: 'direct-file',
    urlDuration: String(parseStoredDurationSeconds(note.duration) ?? ''),
    transcriptionOption: transcriptionService,
    transcriptionModel: note.transcription_model || getDefaultTranscriptionModelForService(transcriptionService),
  }
}

export const buildAppendAssetsOptions = (
  form: AppendAssetsFormData,
  note: ShowNote
): ProcessingOptions => {
  const options = buildProcessingOptions(toProcessingFormData(form, note))

  return {
    ...options,
    url: note.url,
    inputType: note.input_type ?? 'audio-video',
    urlDuration: parseStoredDurationSeconds(note.duration),
    documentService: note.document_service ?? undefined,
    documentModel: note.document_model
      ? note.document_model as ProcessingOptions['documentModel']
      : undefined,
    documentType: note.document_type ?? undefined,
    documentPageCount: note.document_page_count ?? undefined,
  }
}

export const hasAnyAppendAssetSelection = (options: ProcessingOptions): boolean => {
  return !!(
    options.llmEnabled
    || options.ttsEnabled
    || options.imageGenEnabled
    || options.musicGenEnabled
    || options.videoGenEnabled
  )
}

export const estimateAppendAssetsCostBreakdown = (options: ProcessingOptions) => {
  const breakdown = estimateCostBreakdown(options)
  const total = breakdown.llm + breakdown.tts + breakdown.image + breakdown.music + breakdown.video

  return {
    ...breakdown,
    transcription: 0,
    document: 0,
    total
  }
}

export const computeAppendAssetsCost = (
  options: ProcessingOptions,
  metadata: AppendAssetsMetadata
): number => {
  const estimated = estimateAppendAssetsCostBreakdown(options)

  const llm = metadata.llm?.actualCostUsd ?? estimated.llm
  const tts = metadata.tts?.actualCostUsd ?? estimated.tts
  const image = metadata.image?.actualCostUsd ?? estimated.image
  const music = metadata.music?.actualCostUsd ?? estimated.music
  const video = metadata.video?.actualCostUsd ?? estimated.video

  return llm + tts + image + music + video
}

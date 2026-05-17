import { DOCUMENT_CONFIG,getAvailableDocumentModels,getDocumentPreprocessPlan,getServerDocumentRuntimeCapabilities,isValidImageModel,isValidLLMModel,isValidMusicModel,isValidTTSModel,isValidTranscriptionModel,isValidVideoModel } from '~/models'
import type {
DocumentExtractionModel,
DocumentExtractionServiceType,
ImageGenServiceType,
MusicServiceType,ProcessingFormData,ProcessingOptions,SourceRoutesApiProcessFormHelpersBuildOptionsResolvedFeatures as ResolvedFeatures,SourceRoutesApiProcessFormHelpersBuildOptionsResolvedMedia as ResolvedMedia,SourceRoutesApiProcessFormHelpersBuildOptionsResolvedSource as ResolvedSource,ResolvedUploadSource,TTSServiceType,
VideoGenServiceType
} from '~/types'
import { MUSIC_BITRATES,MUSIC_SAMPLE_RATES,parseCommaSeparated } from './options-shared'
import { resolveMediaOptions,resolveSourceOptions } from './resolve-options'

export const isValidDocumentModel = (
  service: DocumentExtractionServiceType,
  model: string
): model is DocumentExtractionModel => {
  return DOCUMENT_CONFIG[service]?.models.some(candidate => candidate.id === model) ?? false
}

const requireValue = (value: string | undefined, label: string): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`${label} is required`)
  }

  return value
}

const resolveFeatureFlags = (form: ProcessingFormData) => ({
  llmEnabled: form.llmEnabled === 'true',
  ttsEnabled: form.ttsEnabled === 'true',
  imageGenEnabled: form.imageGenEnabled === 'true',
  musicGenEnabled: form.musicGenEnabled === 'true',
  videoGenEnabled: form.videoGenEnabled === 'true'
})

const logReceivedFormData = (_form: ProcessingFormData): void => {
}

const resolveLLMSelection = (
  form: ProcessingFormData,
  features: ResolvedFeatures
): Pick<ProcessingOptions, 'llmService' | 'llmModel' | 'selectedPrompts'> => {
  if (!features.llmEnabled) {
    return {
      llmService: undefined,
      llmModel: undefined,
      selectedPrompts: []
    }
  }

  const llmService = requireValue(form.llmService, 'LLM service')
  const llmModel = requireValue(form.llmModel, 'LLM model')

  if (!isValidLLMModel(llmService, llmModel)) {
    throw new Error(`Invalid LLM model for service: ${llmService}`)
  }

  return {
    llmService: llmService as ProcessingOptions['llmService'],
    llmModel,
    selectedPrompts: parseCommaSeparated(form.selectedPrompts)
  }
}

const resolveTranscriptionSelection = (
  form: ProcessingFormData,
  source: ResolvedSource
): Pick<ProcessingOptions, 'transcriptionService' | 'transcriptionModel'> => {
  if (source.inputType === 'document') {
    return {
      transcriptionService: (form.transcriptionOption || 'groq') as ProcessingOptions['transcriptionService'],
      transcriptionModel: form.transcriptionModel || ''
    }
  }

  const transcriptionService = requireValue(form.transcriptionOption, 'Transcription service')
  const transcriptionModel = requireValue(form.transcriptionModel, 'Transcription model')

  if (!isValidTranscriptionModel(
    transcriptionService as ProcessingOptions['transcriptionService'],
    transcriptionModel
  )) {
    throw new Error(`Invalid transcription model for service: ${transcriptionService}`)
  }

  if (transcriptionService === 'youtube' && source.urlType !== 'youtube') {
    throw new Error('YouTube Captions can only be used for YouTube URLs')
  }

  return {
    transcriptionService: transcriptionService as ProcessingOptions['transcriptionService'],
    transcriptionModel
  }
}

const validateTtsConfiguration = (features: ResolvedFeatures, media: ResolvedMedia): void => {
  if (!features.ttsEnabled) return

  const ttsService = requireValue(media.ttsService, 'TTS service') as TTSServiceType
  const ttsModel = requireValue(media.ttsModel, 'TTS model')
  requireValue(media.ttsVoice, 'TTS voice')

  if (!isValidTTSModel(ttsService, ttsModel)) {
    throw new Error(`Invalid TTS model for service: ${ttsService}`)
  }
}

const validateImageConfiguration = (
  form: ProcessingFormData,
  features: ResolvedFeatures,
  media: ResolvedMedia
): void => {
  if (!features.imageGenEnabled) return

  const imageService = requireValue(media.imageService, 'Image service') as ImageGenServiceType
  const imageModel = requireValue(media.imageModel, 'Image model')
  requireValue(media.imageDimensionOrRatio, 'Image dimension or ratio')

  if (!isValidImageModel(imageService, imageModel)) {
    throw new Error(`Invalid image model for service: ${imageService}`)
  }

  if (parseCommaSeparated(form.selectedImagePrompts).length === 0) {
    throw new Error('At least one image prompt is required')
  }
}

const validateMusicConfiguration = (
  form: ProcessingFormData,
  features: ResolvedFeatures,
  media: ResolvedMedia
): void => {
  if (!features.musicGenEnabled) return

  const musicService = requireValue(media.musicService, 'Music service') as MusicServiceType
  const musicModel = requireValue(media.musicModel, 'Music model')
  requireValue(media.selectedMusicGenre, 'Music genre')

  const musicPreset = requireValue(form.musicPreset, 'Music preset') as ProcessingOptions['musicPreset']
  const musicDuration = Number(requireValue(form.musicDurationSeconds, 'Music duration seconds'))
  const musicInstrumental = requireValue(form.musicInstrumental, 'Music instrumental')

  if (!isValidMusicModel(musicService, musicModel)) {
    throw new Error(`Invalid music model for service: ${musicService}`)
  }

  if (!['cheap', 'balanced', 'quality'].includes(musicPreset || '')) {
    throw new Error('Music preset must be one of: cheap, balanced, quality')
  }

  if (!Number.isInteger(musicDuration) || musicDuration < 3 || musicDuration > 300) {
    throw new Error('Music duration seconds must be an integer between 3 and 300')
  }

  if (musicInstrumental !== 'true' && musicInstrumental !== 'false') {
    throw new Error('Music instrumental must be true or false')
  }

  if (form.musicSampleRate) {
    const sampleRate = Number(form.musicSampleRate)
    if (!MUSIC_SAMPLE_RATES.includes(sampleRate)) {
      throw new Error('Music sample rate must be one of: 16000, 24000, 32000, 44100')
    }
  }

  if (form.musicBitrate) {
    const bitrate = Number(form.musicBitrate)
    if (!MUSIC_BITRATES.includes(bitrate)) {
      throw new Error('Music bitrate must be one of: 32000, 64000, 128000, 256000')
    }
  }
}

const validateVideoConfiguration = (
  form: ProcessingFormData,
  features: ResolvedFeatures,
  media: ResolvedMedia
): void => {
  if (!features.videoGenEnabled) return

  const videoService = requireValue(media.videoService, 'Video service') as VideoGenServiceType
  const videoModel = requireValue(media.videoModel, 'Video model')
  requireValue(media.videoSize, 'Video size')
  requireValue(form.videoDuration, 'Video duration')

  if (!isValidVideoModel(videoService, videoModel)) {
    throw new Error(`Invalid video model for service: ${videoService}`)
  }

  if (parseCommaSeparated(form.selectedVideoPrompts).length === 0) {
    throw new Error('At least one video prompt is required')
  }
}

const validateDocumentConfiguration = (source: ResolvedSource): void => {
  if (source.inputType !== 'document') return

  if (!source.documentType) {
    throw new Error('Document type is required')
  }

  if (!source.documentService) {
    throw new Error('Document service is required')
  }

  if (!source.documentModel) {
    throw new Error('Document model is required')
  }

  const runtimeCapabilities = getServerDocumentRuntimeCapabilities()
  const documentService = source.documentService as DocumentExtractionServiceType
  const documentModel = source.documentModel

  if (!isValidDocumentModel(documentService, documentModel)) {
    throw new Error(`Invalid document model for service: ${documentService}`)
  }

  const preprocessPlan = getDocumentPreprocessPlan(documentService, source.documentType, runtimeCapabilities)
  if (!preprocessPlan.supported) {
    throw new Error(preprocessPlan.reason)
  }

  const availableModels = getAvailableDocumentModels(documentService, source.documentType, runtimeCapabilities)
  if (!availableModels.includes(documentModel)) {
    throw new Error(`Invalid document model for ${documentService} and ${source.documentType}`)
  }
}

const logProcessingOptions = (
  _source: ResolvedSource,
  _features: ResolvedFeatures,
  _media: ResolvedMedia,
  _options: ProcessingOptions
): void => {
}

export const buildProcessingOptions = (
  form: ProcessingFormData,
  resolvedUpload?: ResolvedUploadSource
): ProcessingOptions => {
  logReceivedFormData(form)

  const features = resolveFeatureFlags(form)
  const source = resolveSourceOptions(form, resolvedUpload)
  const media = resolveMediaOptions(form, features)
  const llm = resolveLLMSelection(form, features)
  const transcription = resolveTranscriptionSelection(form, source)

  validateTtsConfiguration(features, media)
  validateImageConfiguration(form, features, media)
  validateMusicConfiguration(form, features, media)
  validateVideoConfiguration(form, features, media)
  validateDocumentConfiguration(source)

  const options: ProcessingOptions = {
    ...source,
    ...features,
    ...media,
    ...llm,
    ...transcription,
    llmCustomInstructions: features.llmEnabled && form.llmCustomInstructions ? form.llmCustomInstructions : undefined,
    imageCustomInstructions: features.imageGenEnabled && form.imageCustomInstructions ? form.imageCustomInstructions : undefined,
    musicCustomInstructions: features.musicGenEnabled && form.musicCustomInstructions ? form.musicCustomInstructions : undefined,
    videoCustomInstructions: features.videoGenEnabled && form.videoCustomInstructions ? form.videoCustomInstructions : undefined,
    outputDir: '',
  }

  logProcessingOptions(source, features, media, options)

  return options
}

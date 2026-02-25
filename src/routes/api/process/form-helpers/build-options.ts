import type { ProcessingOptions, ProcessingFormData } from '~/types'
import { l } from '~/utils/logging'
import { resolveFeatureFlags, resolveSourceOptions, resolveMediaOptions } from './resolve-options'
import { isValidLLMModel, isValidTranscriptionModel, isValidTTSModel, isValidImageModel, isValidMusicModel, isValidVideoModel } from '~/models'
import type { ImageGenServiceType, MusicServiceType, VideoGenServiceType } from '~/types'

const parseCommaSeparated = (value: string | undefined): string[] => {
  return value ? value.split(',').filter(p => p.length > 0) : []
}

const requireValue = (value: string | undefined, label: string): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`${label} is required`)
  }
  return value
}

const MUSIC_SAMPLE_RATES = [16000, 24000, 32000, 44100]
const MUSIC_BITRATES = [32000, 64000, 128000, 256000]

export const buildProcessingOptions = (form: ProcessingFormData): ProcessingOptions => {
  const features = resolveFeatureFlags(form)
  const source = resolveSourceOptions(form)
  const media = resolveMediaOptions(form, features)

  l('Form data received', {
    url: form.url ? 'present' : 'null',
    transcriptionOption: form.transcriptionOption,
    transcriptionModel: form.transcriptionModel,
    llmModel: form.llmModel,
    uploadedFilePath: form.uploadedFilePath ? 'present' : 'null',
    uploadedFileName: form.uploadedFileName || 'null',
    selectedPrompts: form.selectedPrompts || 'null',
    urlType: form.urlType || 'null',
    urlDuration: form.urlDuration || 'null',
    urlFileSize: form.urlFileSize || 'null',
    ttsEnabled: form.ttsEnabled,
    ttsService: form.ttsService || 'null',
    ttsVoice: form.ttsVoice || 'null',
    imageGenEnabled: form.imageGenEnabled,
    selectedImagePrompts: form.selectedImagePrompts || 'null',
    musicGenSkipped: form.musicGenSkipped,
    selectedMusicGenre: form.selectedMusicGenre || 'null',
    musicPreset: form.musicPreset || 'null',
    musicDurationSeconds: form.musicDurationSeconds || 'null',
    musicInstrumental: form.musicInstrumental || 'null',
    musicSampleRate: form.musicSampleRate || 'null',
    musicBitrate: form.musicBitrate || 'null',
    videoGenEnabled: form.videoGenEnabled,
    selectedVideoPrompts: form.selectedVideoPrompts || 'null',
    videoModel: form.videoModel || 'null',
    videoSize: form.videoSize || 'null',
    videoDuration: form.videoDuration || 'null'
  })

  const llmService = requireValue(form.llmService, 'LLM service')
  const llmModel = requireValue(form.llmModel, 'LLM model')
  if (!isValidLLMModel(llmService, llmModel)) {
    throw new Error(`Invalid LLM model for service: ${llmService}`)
  }

  const transcriptionService = requireValue(form.transcriptionOption, 'Transcription service')
  const transcriptionModel = requireValue(form.transcriptionModel, 'Transcription model')
  if (!isValidTranscriptionModel(transcriptionService as ProcessingOptions['transcriptionService'], transcriptionModel)) {
    throw new Error(`Invalid transcription model for service: ${transcriptionService}`)
  }

  if (features.ttsEnabled) {
    const ttsService = requireValue(media.ttsService, 'TTS service') as 'openai' | 'elevenlabs' | 'groq'
    const ttsModel = requireValue(media.ttsModel, 'TTS model')
    requireValue(media.ttsVoice, 'TTS voice')
    if (!isValidTTSModel(ttsService, ttsModel)) {
      throw new Error(`Invalid TTS model for service: ${ttsService}`)
    }
  }

  if (features.imageGenEnabled) {
    const imageService = requireValue(media.imageService, 'Image service') as ImageGenServiceType
    const imageModel = requireValue(media.imageModel, 'Image model')
    requireValue(media.imageDimensionOrRatio, 'Image dimension or ratio')
    if (!isValidImageModel(imageService, imageModel)) {
      throw new Error(`Invalid image model for service: ${imageService}`)
    }
    const imagePrompts = parseCommaSeparated(form.selectedImagePrompts)
    if (imagePrompts.length === 0) {
      throw new Error('At least one image prompt is required')
    }
  }

  if (features.musicGenEnabled) {
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

  if (features.videoGenEnabled) {
    const videoService = requireValue(media.videoService, 'Video service') as VideoGenServiceType
    const videoModel = requireValue(media.videoModel, 'Video model')
    requireValue(media.videoSize, 'Video size')
    requireValue(form.videoDuration, 'Video duration')
    if (!isValidVideoModel(videoService, videoModel)) {
      throw new Error(`Invalid video model for service: ${videoService}`)
    }
    const videoPrompts = parseCommaSeparated(form.selectedVideoPrompts)
    if (videoPrompts.length === 0) {
      throw new Error('At least one video prompt is required')
    }
  }

  const options: ProcessingOptions = {
    ...source,
    ...features,
    ...media,
    llmService: llmService as ProcessingOptions['llmService'],
    llmModel,
    outputDir: '',
    transcriptionService: transcriptionService as ProcessingOptions['transcriptionService'],
    transcriptionModel,
    selectedPrompts: parseCommaSeparated(form.selectedPrompts)
  }

  l('Processing options', {
    url: source.isLocalFile ? null : 'present',
    filePath: source.isLocalFile ? source.localFilePath : null,
    fileName: source.isLocalFile ? source.localFileName : null,
    urlType: source.urlType || null,
    llmModel: options.llmModel,
    transcriptionService: options.transcriptionService,
    isLocalFile: source.isLocalFile,
    selectedPrompts: options.selectedPrompts,
    transcriptionModel: options.transcriptionModel || 'default',
    ttsEnabled: features.ttsEnabled,
    ttsService: media.ttsService || null,
    ttsVoice: media.ttsVoice || null,
    ttsModel: media.ttsModel || null,
    imageGenEnabled: features.imageGenEnabled,
    selectedImagePrompts: features.imageGenEnabled ? media.selectedImagePrompts : null,
    musicGenEnabled: features.musicGenEnabled,
    musicService: features.musicGenEnabled ? media.musicService : null,
    selectedMusicGenre: features.musicGenEnabled ? media.selectedMusicGenre : null,
    musicPreset: features.musicGenEnabled ? media.musicPreset : null,
    musicDurationSeconds: features.musicGenEnabled ? media.musicDurationSeconds : null,
    musicInstrumental: features.musicGenEnabled ? media.musicInstrumental : null,
    musicSampleRate: features.musicGenEnabled ? media.musicSampleRate : null,
    musicBitrate: features.musicGenEnabled ? media.musicBitrate : null,
    videoGenEnabled: features.videoGenEnabled,
    videoService: features.videoGenEnabled ? media.videoService : null,
    selectedVideoPrompts: features.videoGenEnabled ? media.selectedVideoPrompts : null,
    videoModel: features.videoGenEnabled ? media.videoModel : null,
    videoSize: features.videoGenEnabled ? media.videoSize : null,
    videoDuration: features.videoGenEnabled ? media.videoDuration : null,
    videoAspectRatio: features.videoGenEnabled ? media.videoAspectRatio : null
  })

  return options
}

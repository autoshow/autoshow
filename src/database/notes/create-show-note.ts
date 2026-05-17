import type { SQL } from "bun"
import { computeFinalCost } from '~/utils/cost/final-cost'
import { estimateProcessingBreakdown } from '~/utils/cost/runtime-estimation'
import type { SourceDatabaseNotesCreateShowNoteAudioStep1Metadata as AudioStep1Metadata,SourceDatabaseNotesCreateShowNoteAudioStep2Metadata as AudioStep2Metadata,SourceDatabaseNotesCreateShowNoteDocumentStep1Metadata as DocumentStep1Metadata,ProcessingMetadata,ProcessingOptions,Step2DocumentMetadata } from '~/types'
import {
getImageProcessingMetadata,
getLlmProcessingMetadata,
getMusicProcessingMetadata,
getRunMediaMetadata,
getTtsProcessingMetadata,
getVideoProcessingMetadata,
} from '~/types'

const joinStrings = (values?: readonly (string | null | undefined)[]): string | null => {
  if (!values) return null
  const filtered = values.filter((value): value is string => !!value)
  return filtered.length > 0 ? filtered.join(',') : null
}

const joinUploadResultField = <T extends Record<string, unknown>>(
  results: readonly T[] | undefined,
  field: keyof T
): string | null => {
  return joinStrings((results ?? []).map(result => {
    const value = result[field]
    return typeof value === 'string' && value.length > 0 ? value : undefined
  }))
}

const buildDocumentSourceFields = (
  step1: DocumentStep1Metadata,
  step2: Step2DocumentMetadata,
  options: ProcessingOptions
) => ({
  transcriptionService: null,
  transcriptionModel: null,
  transcriptionProcessingTime: null,
  transcriptionTokenCount: null,
  transcriptionCost: null,
  documentService: step2.extractionService ?? null,
  documentModel: step2.extractionModel ?? null,
  documentType: step1.documentType ?? options.documentType ?? null,
  documentPageCount: step1.pageCount ?? step2.pageCount ?? null,
  documentProcessingTime: step2.processingTime ?? null,
  documentCharacterCount: step2.characterCount ?? null,
  documentInputTokenCount: step2.inputTokenCount ?? null,
  documentOutputTokenCount: step2.outputTokenCount ?? null,
  documentCost: step2.totalCost ?? null,
  videoPublishDate: null,
  videoThumbnail: null,
  channelUrl: null,
  audioFileName: null,
  audioFileSize: null,
  audioS3Url: null,
})

const buildAudioSourceFields = (
  step1: AudioStep1Metadata,
  step2: AudioStep2Metadata,
  options: ProcessingOptions
) => ({
  transcriptionService: options.transcriptionService ?? null,
  transcriptionModel: step2.transcriptionModel ?? null,
  transcriptionProcessingTime: step2.processingTime ?? null,
  transcriptionTokenCount: step2.tokenCount ?? null,
  transcriptionCost: step2.totalCost ?? null,
  documentService: null,
  documentModel: null,
  documentType: null,
  documentPageCount: null,
  documentProcessingTime: null,
  documentCharacterCount: null,
  documentInputTokenCount: null,
  documentOutputTokenCount: null,
  documentCost: null,
  videoPublishDate: step1.videoPublishDate ?? null,
  videoThumbnail: step1.videoThumbnail ?? null,
  channelUrl: step1.channelUrl ?? null,
  audioFileName: step1.audioFileName ?? null,
  audioFileSize: step1.audioFileSize ?? null,
  audioS3Url: step1.audioS3Url ?? null,
})

const buildSourceFields = (
  processingMetadata: ProcessingMetadata,
  options: ProcessingOptions
) => {
  if ('documentUrl' in processingMetadata.step1) {
    return buildDocumentSourceFields(
      processingMetadata.step1 as DocumentStep1Metadata,
      processingMetadata.step2 as Step2DocumentMetadata,
      options
    )
  }

  return buildAudioSourceFields(
    processingMetadata.step1 as AudioStep1Metadata,
    processingMetadata.step2 as AudioStep2Metadata,
    options
  )
}

const buildLlmFields = (processingMetadata: ProcessingMetadata, options: ProcessingOptions) => {
  const llmMetadata = getLlmProcessingMetadata(processingMetadata)

  return {
  llmService: llmMetadata?.llmService ?? null,
  llmModel: options.llmModel ?? null,
  llmProcessingTime: llmMetadata?.processingTime ?? null,
  llmInputTokenCount: llmMetadata?.inputTokenCount ?? null,
  llmOutputTokenCount: llmMetadata?.outputTokenCount ?? null,
  llmCost: llmMetadata?.totalCost ?? null,
  selectedPrompts: joinStrings(options.selectedPrompts ?? []),
}
}

const buildTtsFields = (processingMetadata: ProcessingMetadata) => {
  const ttsMetadata = getTtsProcessingMetadata(processingMetadata)

  return {
    ttsEnabled: ttsMetadata != null,
    ttsService: ttsMetadata?.ttsService ?? null,
    ttsModel: ttsMetadata?.ttsModel ?? null,
    ttsVoice: ttsMetadata?.ttsVoice ?? null,
    ttsAudioFile: ttsMetadata?.audioFileName ?? null,
    ttsProcessingTime: ttsMetadata?.processingTime ?? null,
    ttsAudioDuration: ttsMetadata?.audioDuration ?? null,
    ttsCost: ttsMetadata?.totalCost ?? null,
    ttsS3Url: ttsMetadata?.ttsS3Url ?? null,
  }
}

const buildImageFields = (processingMetadata: ProcessingMetadata) => {
  const mediaMetadata = getRunMediaMetadata(processingMetadata)
  const imageMetadata = getImageProcessingMetadata(processingMetadata)

  return {
    imageGenEnabled: mediaMetadata?.imageEnabled ?? false,
    imageGenService: imageMetadata?.imageGenService ?? null,
    imageGenModel: imageMetadata?.imageGenModel ?? null,
    imagesGenerated: imageMetadata?.imagesGenerated ?? null,
    imageGenProcessingTime: imageMetadata?.processingTime ?? null,
    imageGenCost: imageMetadata?.totalCost ?? null,
    selectedImagePrompts: joinStrings(imageMetadata?.selectedPrompts),
    imageFiles: joinUploadResultField(imageMetadata?.results, 'fileName'),
    imageS3Urls: joinUploadResultField(imageMetadata?.results, 's3Url'),
  }
}

const buildMusicFields = (processingMetadata: ProcessingMetadata) => {
  const mediaMetadata = getRunMediaMetadata(processingMetadata)
  const musicMetadata = getMusicProcessingMetadata(processingMetadata)

  return {
    musicGenEnabled: mediaMetadata?.musicEnabled ?? false,
    musicGenService: musicMetadata?.musicService ?? null,
    musicGenModel: musicMetadata?.musicModel ?? null,
    musicGenGenre: musicMetadata?.selectedGenre ?? null,
    musicGenPreset: musicMetadata?.musicPreset ?? null,
    musicGenTargetDuration: musicMetadata?.targetDurationSeconds ?? null,
    musicGenInstrumental: musicMetadata?.instrumental ?? null,
    musicGenSampleRate: musicMetadata?.sampleRate ?? null,
    musicGenBitrate: musicMetadata?.bitrate ?? null,
    musicGenFile: musicMetadata?.musicFileName ?? null,
    musicGenProcessingTime: musicMetadata?.processingTime ?? null,
    musicGenDuration: musicMetadata?.musicDuration ?? null,
    musicGenCost: musicMetadata?.totalCost ?? null,
    musicGenLyricsLength: musicMetadata?.lyricsLength ?? null,
    musicGenLyricsGenerationTime: musicMetadata?.lyricsGenerationTime ?? null,
    musicGenLyrics: musicMetadata?.lyricsText ?? null,
    musicS3Url: musicMetadata?.musicS3Url ?? null,
  }
}

const buildVideoFields = (processingMetadata: ProcessingMetadata) => {
  const mediaMetadata = getRunMediaMetadata(processingMetadata)
  const videoMetadata = getVideoProcessingMetadata(processingMetadata)

  return {
    videoGenEnabled: mediaMetadata?.videoEnabled ?? false,
    videoGenService: videoMetadata?.videoGenService ?? null,
    videoGenModel: videoMetadata?.videoGenModel ?? null,
    videosGenerated: videoMetadata?.videosGenerated ?? null,
    videoGenProcessingTime: videoMetadata?.processingTime ?? null,
    videoGenCost: videoMetadata?.totalCost ?? null,
    selectedVideoPrompts: joinStrings(videoMetadata?.selectedPrompts),
    videoSize: videoMetadata?.selectedSize ?? null,
    videoDuration: videoMetadata?.selectedDuration ?? null,
    videoFiles: joinUploadResultField(videoMetadata?.results, 'fileName'),
    videoS3Urls: joinUploadResultField(videoMetadata?.results, 's3Url'),
    thumbnailS3Url: joinUploadResultField(videoMetadata?.results, 'thumbnailS3Url'),
  }
}

const buildBackupFields = (processingMetadata: ProcessingMetadata) => ({
  documentBackupUrl: processingMetadata.backup?.bucketUrl ?? null,
  documentBackupKey: processingMetadata.backup?.objectKey ?? null,
  documentBackupUploadedAt: processingMetadata.backup?.uploadedAt ?? null,
})

const buildShowNoteInsertRecord = (
  showNoteId: string,
  metadata: { url: string, title: string, author?: string, duration?: string },
  options: ProcessingOptions,
  processingMetadata: ProcessingMetadata,
  promptInstructions: string | null,
  textOutput: string | null,
  transcriptionText: string
) => {
  const totalCostUsd = computeFinalCost(options, processingMetadata)
  const estimatedProcessingBreakdown = JSON.stringify(estimateProcessingBreakdown(options))

  return {
    id: showNoteId,
    totalCostUsd,
    url: metadata.url,
    title: metadata.title,
    author: metadata.author ?? null,
    duration: metadata.duration ?? null,
    prompt: promptInstructions,
    textOutput,
    transcription: transcriptionText,
    processedAt: Date.now(),
    estimatedProcessingBreakdown,
    inputType: options.inputType ?? null,
    ...buildSourceFields(processingMetadata, options),
    ...buildLlmFields(processingMetadata, options),
    ...buildTtsFields(processingMetadata),
    ...buildImageFields(processingMetadata),
    ...buildMusicFields(processingMetadata),
    ...buildVideoFields(processingMetadata),
    ...buildBackupFields(processingMetadata),
  }
}

const insertShowNote = async (
  db: SQL,
  record: ReturnType<typeof buildShowNoteInsertRecord>
): Promise<void> => {
  await db`
    INSERT INTO show_notes (
      id, total_cost_usd, url, title, author, duration, prompt, text_output,
      transcription, transcription_service, transcription_model,
      document_service, document_model, document_type, document_page_count,
      document_processing_time, document_character_count, document_input_token_count, document_output_token_count, document_cost,
      llm_service, llm_model, processed_at, estimated_processing_breakdown, video_publish_date, video_thumbnail,
      channel_url, audio_file_name, audio_file_size,
      transcription_processing_time, transcription_token_count, transcription_cost,
      llm_processing_time, llm_input_token_count,
      llm_output_token_count, llm_cost, selected_prompts,
      tts_enabled, tts_service, tts_model, tts_voice, tts_audio_file,
      tts_processing_time, tts_audio_duration, tts_cost,
      image_gen_enabled, image_gen_service, image_gen_model, images_generated,
      image_gen_processing_time, image_gen_cost, selected_image_prompts, image_files,
      music_gen_enabled, music_gen_service, music_gen_model, music_gen_genre, music_gen_preset, music_gen_target_duration, music_gen_instrumental, music_gen_sample_rate, music_gen_bitrate, music_gen_file,
      music_gen_processing_time, music_gen_duration, music_gen_cost, music_gen_lyrics_length, music_gen_lyrics_generation_time, music_gen_lyrics,
      video_gen_enabled, video_gen_service, video_gen_model, videos_generated,
      video_gen_processing_time, video_gen_cost, selected_video_prompts, video_size, video_duration, video_files,
      document_backup_url, document_backup_key, document_backup_uploaded_at,
      input_type,
      audio_s3_url, tts_s3_url, image_s3_urls, music_s3_url, video_s3_urls, thumbnail_s3_url
    ) VALUES (
      ${record.id}, ${record.totalCostUsd}, ${record.url}, ${record.title}, ${record.author}, ${record.duration}, ${record.prompt}, ${record.textOutput},
      ${record.transcription}, ${record.transcriptionService}, ${record.transcriptionModel},
      ${record.documentService}, ${record.documentModel}, ${record.documentType}, ${record.documentPageCount},
      ${record.documentProcessingTime}, ${record.documentCharacterCount}, ${record.documentInputTokenCount}, ${record.documentOutputTokenCount}, ${record.documentCost},
      ${record.llmService}, ${record.llmModel}, ${record.processedAt}, ${record.estimatedProcessingBreakdown}, ${record.videoPublishDate}, ${record.videoThumbnail},
      ${record.channelUrl}, ${record.audioFileName}, ${record.audioFileSize},
      ${record.transcriptionProcessingTime}, ${record.transcriptionTokenCount}, ${record.transcriptionCost},
      ${record.llmProcessingTime}, ${record.llmInputTokenCount},
      ${record.llmOutputTokenCount}, ${record.llmCost}, ${record.selectedPrompts},
      ${record.ttsEnabled}, ${record.ttsService}, ${record.ttsModel}, ${record.ttsVoice}, ${record.ttsAudioFile},
      ${record.ttsProcessingTime}, ${record.ttsAudioDuration}, ${record.ttsCost},
      ${record.imageGenEnabled}, ${record.imageGenService}, ${record.imageGenModel}, ${record.imagesGenerated},
      ${record.imageGenProcessingTime}, ${record.imageGenCost}, ${record.selectedImagePrompts}, ${record.imageFiles},
      ${record.musicGenEnabled}, ${record.musicGenService}, ${record.musicGenModel}, ${record.musicGenGenre}, ${record.musicGenPreset}, ${record.musicGenTargetDuration}, ${record.musicGenInstrumental}, ${record.musicGenSampleRate}, ${record.musicGenBitrate}, ${record.musicGenFile},
      ${record.musicGenProcessingTime}, ${record.musicGenDuration}, ${record.musicGenCost}, ${record.musicGenLyricsLength}, ${record.musicGenLyricsGenerationTime}, ${record.musicGenLyrics},
      ${record.videoGenEnabled}, ${record.videoGenService}, ${record.videoGenModel}, ${record.videosGenerated},
      ${record.videoGenProcessingTime}, ${record.videoGenCost}, ${record.selectedVideoPrompts}, ${record.videoSize}, ${record.videoDuration}, ${record.videoFiles},
      ${record.documentBackupUrl}, ${record.documentBackupKey}, ${record.documentBackupUploadedAt},
      ${record.inputType},
      ${record.audioS3Url}, ${record.ttsS3Url}, ${record.imageS3Urls}, ${record.musicS3Url}, ${record.videoS3Urls}, ${record.thumbnailS3Url}
    )
  `
}

export const createShowNote = async (
  db: SQL,
  showNoteId: string,
  metadata: { url: string, title: string, author?: string, duration?: string },
  options: ProcessingOptions,
  processingMetadata: ProcessingMetadata,
  promptInstructions: string | null,
  textOutput: string | null,
  transcriptionText: string
): Promise<void> => {
  try {
    const record = buildShowNoteInsertRecord(
      showNoteId,
      metadata,
      options,
      processingMetadata,
      promptInstructions,
      textOutput,
      transcriptionText
    )

    await insertShowNote(db, record)
  } catch (error) {
    throw error
  }
}

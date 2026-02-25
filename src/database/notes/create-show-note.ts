import type { ProcessingOptions, ProcessingMetadata, Step2DocumentMetadata } from '~/types'
import { err } from '~/utils/logging'
import type { SQL } from "bun"

export const createShowNote = async (
  db: SQL,
  showNoteId: string,
  metadata: { url: string, title: string, author?: string, duration?: string },
  options: ProcessingOptions,
  processingMetadata: ProcessingMetadata,
  promptInstructions: string,
  textOutput: string,
  transcriptionText: string
): Promise<void> => {
  try {
    const isDocument = 'documentUrl' in processingMetadata.step1
    const imageFiles = processingMetadata.step6?.results.map(r => r.fileName).join(',') || null
    const videoFiles = processingMetadata.step8?.results.map(r => r.fileName).join(',') || null

    const imageS3Urls = processingMetadata.step6?.results.map(r => r.s3Url).filter(Boolean).join(',') || null
    const videoS3Urls = processingMetadata.step8?.results.map(r => r.s3Url).filter(Boolean).join(',') || null
    const thumbnailS3Urls = processingMetadata.step8?.results.map(r => r.thumbnailS3Url).filter(Boolean).join(',') || null

    let transcriptionService: string | null = null
    let transcriptionModel: string | null = null
    let documentService: string | null = null
    let documentModel: string | null = null
    let videoPublishDate: string | null = null
    let videoThumbnail: string | null = null
    let channelUrl: string | null = null
    let audioFileName: string | null = null
    let audioFileSize: number | null = null
    let transcriptionTokenCount: number | null = null
    let audioS3Url: string | null = null

    if (isDocument) {
      const step2Doc = processingMetadata.step2 as Step2DocumentMetadata
      documentService = options.documentService ?? null
      documentModel = step2Doc.extractionModel
      transcriptionTokenCount = step2Doc.characterCount ?? null
    } else {
      const step1 = processingMetadata.step1 as { videoPublishDate?: string, videoThumbnail?: string, channelUrl?: string, audioFileName: string, audioFileSize: number, audioS3Url?: string }
      const step2 = processingMetadata.step2 as { transcriptionModel: string, tokenCount: number }
      transcriptionService = options.transcriptionService ?? null
      transcriptionModel = step2.transcriptionModel
      videoPublishDate = step1.videoPublishDate ?? null
      videoThumbnail = step1.videoThumbnail ?? null
      channelUrl = step1.channelUrl ?? null
      audioFileName = step1.audioFileName ?? null
      audioFileSize = step1.audioFileSize ?? null
      transcriptionTokenCount = step2.tokenCount ?? null
      audioS3Url = step1.audioS3Url ?? null
    }

    const processedAt = Date.now()
    const createdAt = processedAt

    await db`
      INSERT INTO show_notes (
        id, url, title, author, duration, prompt, text_output,
        transcription, transcription_service, transcription_model,
        document_service, document_model,
        llm_service, llm_model, processed_at, created_at, video_publish_date, video_thumbnail,
        channel_url, audio_file_name, audio_file_size,
        transcription_processing_time, transcription_token_count,
        llm_processing_time, llm_input_token_count,
        llm_output_token_count, selected_prompts,
        tts_enabled, tts_service, tts_model, tts_voice, tts_audio_file,
        tts_processing_time, tts_audio_duration,
        image_gen_enabled, image_gen_service, image_gen_model, images_generated,
        image_gen_processing_time, image_gen_cost, selected_image_prompts, image_files,
        music_gen_enabled, music_gen_service, music_gen_model, music_gen_genre, music_gen_preset, music_gen_target_duration, music_gen_instrumental, music_gen_sample_rate, music_gen_bitrate, music_gen_file,
        music_gen_processing_time, music_gen_duration, music_gen_cost, music_gen_lyrics_length, music_gen_lyrics_generation_time, music_gen_lyrics,
        video_gen_enabled, video_gen_service, video_gen_model, videos_generated,
        video_gen_processing_time, video_gen_cost, selected_video_prompts, video_size, video_duration, video_files,
        audio_s3_url, tts_s3_url, image_s3_urls, music_s3_url, video_s3_urls, thumbnail_s3_url
      ) VALUES (
        ${showNoteId}, ${metadata.url}, ${metadata.title}, ${metadata.author ?? null}, ${metadata.duration ?? null}, ${promptInstructions}, ${textOutput},
        ${transcriptionText}, ${transcriptionService}, ${transcriptionModel},
        ${documentService}, ${documentModel},
        ${processingMetadata.step4.llmService}, ${options.llmModel ?? null}, ${processedAt}, ${createdAt}, ${videoPublishDate}, ${videoThumbnail},
        ${channelUrl}, ${audioFileName}, ${audioFileSize},
        ${processingMetadata.step2.processingTime ?? null}, ${transcriptionTokenCount},
        ${processingMetadata.step4?.processingTime ?? null}, ${processingMetadata.step4?.inputTokenCount ?? null},
        ${processingMetadata.step4?.outputTokenCount ?? null}, ${options.selectedPrompts.join(',')},
        ${processingMetadata.step5 ? true : false}, ${processingMetadata.step5?.ttsService ?? null}, ${processingMetadata.step5?.ttsModel ?? null}, ${processingMetadata.step5?.ttsVoice ?? null}, ${processingMetadata.step5?.audioFileName ?? null},
        ${processingMetadata.step5?.processingTime ?? null}, ${processingMetadata.step5?.audioDuration ?? null},
        ${processingMetadata.step6 ? true : false}, ${processingMetadata.step6?.imageGenService ?? null}, ${processingMetadata.step6?.imageGenModel ?? null}, ${processingMetadata.step6?.imagesGenerated ?? null},
        ${processingMetadata.step6?.processingTime ?? null}, ${processingMetadata.step6?.totalCost ?? null}, ${processingMetadata.step6?.selectedPrompts.join(',') ?? null}, ${imageFiles},
        ${processingMetadata.step7 ? true : false}, ${processingMetadata.step7?.musicService ?? null}, ${processingMetadata.step7?.musicModel ?? null}, ${processingMetadata.step7?.selectedGenre ?? null}, ${processingMetadata.step7?.musicPreset ?? null}, ${processingMetadata.step7?.targetDurationSeconds ?? null}, ${processingMetadata.step7?.instrumental ?? null}, ${processingMetadata.step7?.sampleRate ?? null}, ${processingMetadata.step7?.bitrate ?? null}, ${processingMetadata.step7?.musicFileName ?? null},
        ${processingMetadata.step7?.processingTime ?? null}, ${processingMetadata.step7?.musicDuration ?? null}, ${processingMetadata.step7?.totalCost ?? null}, ${processingMetadata.step7?.lyricsLength ?? null}, ${processingMetadata.step7?.lyricsGenerationTime ?? null}, ${processingMetadata.step7?.lyricsText ?? null},
        ${processingMetadata.step8 ? true : false}, ${processingMetadata.step8?.videoGenService ?? null}, ${processingMetadata.step8?.videoGenModel ?? null}, ${processingMetadata.step8?.videosGenerated ?? null},
        ${processingMetadata.step8?.processingTime ?? null}, ${processingMetadata.step8?.totalCost ?? null}, ${processingMetadata.step8?.selectedPrompts.join(',') ?? null}, ${processingMetadata.step8?.selectedSize ?? null}, ${processingMetadata.step8?.selectedDuration ?? null}, ${videoFiles},
        ${audioS3Url}, ${processingMetadata.step5?.ttsS3Url ?? null}, ${imageS3Urls}, ${processingMetadata.step7?.musicS3Url ?? null}, ${videoS3Urls}, ${thumbnailS3Urls}
      )
    `
  } catch (error) {
    err('Failed to create show note', error)
    throw error
  }
}

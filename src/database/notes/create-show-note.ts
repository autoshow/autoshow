import type { ProcessingOptions, ProcessingMetadata } from '~/types/main'
import { ShowNoteInputSchema, validateOrThrow } from '~/types/main'
import { err } from '~/utils/logging'
import { getDatabase, initializeSchema } from '~/database/db'
import type { Database } from "bun:sqlite"

export const createShowNote = (db: Database, id: string, input: unknown): void => {
  const validInput = validateOrThrow(ShowNoteInputSchema, input, 'Invalid show note input')
  
  try {
    if (!validInput.llmService) {
      err('Missing required llmService field')
      throw new Error('llmService is required for database insert')
    }
    
    const query = db.query(`
      INSERT INTO show_notes (
        id, url, title, author, duration, prompt, summary, 
        transcription, transcription_service, transcription_model, 
        llm_service, llm_model, processed_at, video_publish_date, video_thumbnail,
        channel_url, audio_file_name, audio_file_size,
        transcription_processing_time, transcription_token_count,
        llm_processing_time, llm_input_token_count,
        llm_output_token_count, selected_prompts,
        tts_enabled, tts_service, tts_model, tts_voice, tts_audio_file,
        tts_processing_time, tts_audio_duration,
        image_gen_enabled, image_gen_service, image_gen_model, images_generated,
        image_gen_processing_time, selected_image_prompts, image_files,
        music_gen_enabled, music_gen_service, music_gen_model, music_gen_genre, music_gen_file,
        music_gen_processing_time, music_gen_duration, music_gen_lyrics_length, music_gen_lyrics_generation_time, music_gen_lyrics,
        video_gen_enabled, video_gen_service, video_gen_model, videos_generated,
        video_gen_processing_time, selected_video_prompts, video_size, video_duration, video_files
      ) VALUES (
        $id, $url, $title, $author, $duration, $prompt, $summary,
        $transcription, $transcriptionService, $transcriptionModel,
        $llmService, $llmModel, $processedAt, $videoPublishDate, $videoThumbnail,
        $channelUrl, $audioFileName, $audioFileSize,
        $transcriptionProcessingTime, $transcriptionTokenCount,
        $llmProcessingTime, $llmInputTokenCount,
        $llmOutputTokenCount, $selectedPrompts,
        $ttsEnabled, $ttsService, $ttsModel, $ttsVoice, $ttsAudioFile,
        $ttsProcessingTime, $ttsAudioDuration,
        $imageGenEnabled, $imageGenService, $imageGenModel, $imagesGenerated,
        $imageGenProcessingTime, $selectedImagePrompts, $imageFiles,
        $musicGenEnabled, $musicGenService, $musicGenModel, $musicGenGenre, $musicGenFile,
        $musicGenProcessingTime, $musicGenDuration, $musicGenLyricsLength, $musicGenLyricsGenerationTime, $musicGenLyrics,
        $videoGenEnabled, $videoGenService, $videoGenModel, $videosGenerated,
        $videoGenProcessingTime, $selectedVideoPrompts, $videoSize, $videoDuration, $videoFiles
      )
    `)
    
    const imageFiles = validInput.metadata?.step6?.results.map(r => r.fileName).join(',') || null
    const videoFiles = validInput.metadata?.step8?.results.map(r => r.fileName).join(',') || null


    
    query.run({
      id,
      url: validInput.url,
      title: validInput.title,
      author: validInput.author ?? null,
      duration: validInput.duration ?? null,
      prompt: validInput.prompt,
      summary: validInput.summary,
      transcription: validInput.transcription,
      transcriptionService: validInput.transcriptionService,
      transcriptionModel: validInput.transcriptionModel ?? null,
      llmService: validInput.llmService,
      llmModel: validInput.llmModel ?? null,
      processedAt: validInput.processedAt,
      videoPublishDate: validInput.metadata?.step1.videoPublishDate ?? null,
      videoThumbnail: validInput.metadata?.step1.videoThumbnail ?? null,
      channelUrl: validInput.metadata?.step1.channelUrl ?? null,
      audioFileName: validInput.metadata?.step1.audioFileName ?? null,
      audioFileSize: validInput.metadata?.step1.audioFileSize ?? null,
      transcriptionProcessingTime: validInput.metadata?.step2.processingTime ?? null,
      transcriptionTokenCount: validInput.metadata?.step2.tokenCount ?? null,
      llmProcessingTime: validInput.metadata?.step4?.processingTime ?? null,
      llmInputTokenCount: validInput.metadata?.step4?.inputTokenCount ?? null,
      llmOutputTokenCount: validInput.metadata?.step4?.outputTokenCount ?? null,
      selectedPrompts: validInput.selectedPrompts.join(','),
      ttsEnabled: validInput.metadata?.step5 ? 1 : 0,
      ttsService: validInput.metadata?.step5?.ttsService ?? null,
      ttsModel: validInput.metadata?.step5?.ttsModel ?? null,
      ttsVoice: validInput.metadata?.step5?.ttsVoice ?? null,
      ttsAudioFile: validInput.metadata?.step5?.audioFileName ?? null,
      ttsProcessingTime: validInput.metadata?.step5?.processingTime ?? null,
      ttsAudioDuration: validInput.metadata?.step5?.audioDuration ?? null,
      imageGenEnabled: validInput.metadata?.step6 ? 1 : 0,
      imageGenService: validInput.metadata?.step6?.imageGenService ?? null,
      imageGenModel: validInput.metadata?.step6?.imageGenModel ?? null,
      imagesGenerated: validInput.metadata?.step6?.imagesGenerated ?? null,
      imageGenProcessingTime: validInput.metadata?.step6?.processingTime ?? null,
      selectedImagePrompts: validInput.metadata?.step6?.selectedPrompts.join(',') ?? null,
      imageFiles,
      musicGenEnabled: validInput.metadata?.step7 ? 1 : 0,
      musicGenService: validInput.metadata?.step7?.musicService ?? null,
      musicGenModel: validInput.metadata?.step7?.musicModel ?? null,
      musicGenGenre: validInput.metadata?.step7?.selectedGenre ?? null,
      musicGenFile: validInput.metadata?.step7?.musicFileName ?? null,
      musicGenProcessingTime: validInput.metadata?.step7?.processingTime ?? null,
      musicGenDuration: validInput.metadata?.step7?.musicDuration ?? null,
      musicGenLyricsLength: validInput.metadata?.step7?.lyricsLength ?? null,
      musicGenLyricsGenerationTime: validInput.metadata?.step7?.lyricsGenerationTime ?? null,
      musicGenLyrics: validInput.metadata?.step7?.lyricsText ?? null,
      videoGenEnabled: validInput.metadata?.step8 ? 1 : 0,
      videoGenService: validInput.metadata?.step8?.videoGenService ?? null,
      videoGenModel: validInput.metadata?.step8?.videoGenModel ?? null,
      videosGenerated: validInput.metadata?.step8?.videosGenerated ?? null,
      videoGenProcessingTime: validInput.metadata?.step8?.processingTime ?? null,
      selectedVideoPrompts: validInput.metadata?.step8?.selectedPrompts.join(',') ?? null,
      videoSize: validInput.metadata?.step8?.selectedSize ?? null,
      videoDuration: validInput.metadata?.step8?.selectedDuration ?? null,
      videoFiles
    })
  } catch (error) {
    err('Failed to create show note', error)
    throw error
  }
}

export const saveResults = async (
  showNoteId: string,
  metadata: { url: string, title: string, author?: string, duration?: string },
  options: ProcessingOptions,
  processingMetadata: ProcessingMetadata,
  promptInstructions: string
): Promise<void> => {
  try {
    if (!processingMetadata.step4?.llmService) {
      err('Missing llmService in step4 metadata', { step4: processingMetadata.step4 })
      throw new Error('llmService is required in step4 metadata')
    }
    
    if (!processingMetadata.step2?.transcriptionModel) {
      err('Missing transcriptionModel in step2 metadata')
      throw new Error('transcriptionModel is required in step2 metadata')
    }
    
    const db = getDatabase()
    initializeSchema(db)
    
    const summaryPath = `${options.outputDir}/summary.md`
    
    let transcriptionPath = `${options.outputDir}/transcription.txt`
    if (options.transcriptionService === 'happyscribe') {
      transcriptionPath = `${options.outputDir}/transcription-happyscribe.txt`
    }
    
    const summaryExists = (await Bun.$`test -e ${summaryPath}`.quiet().nothrow()).exitCode === 0
    const transcriptionExists = (await Bun.$`test -e ${transcriptionPath}`.quiet().nothrow()).exitCode === 0
    
    if (!summaryExists) {
      err(`Summary file not found: ${summaryPath}`)
      throw new Error('Summary file not found')
    }
    
    if (!transcriptionExists) {
      err(`Transcription file not found: ${transcriptionPath}`)
      throw new Error('Transcription file not found')
    }
    
    const summary = await Bun.file(summaryPath).text()
    const transcriptionText = await Bun.file(transcriptionPath).text()
    
    createShowNote(db, showNoteId, {
      url: metadata.url,
      title: metadata.title,
      author: metadata.author || undefined,
      duration: metadata.duration || undefined,
      prompt: promptInstructions,
      summary,
      transcription: transcriptionText,
      transcriptionService: options.transcriptionService,
      transcriptionModel: processingMetadata.step2.transcriptionModel,
      llmService: processingMetadata.step4.llmService,
      llmModel: options.llmModel,
      processedAt: Date.now(),
      metadata: processingMetadata,
      selectedPrompts: options.selectedPrompts
    })
    
  } catch (error) {
    err('Failed to save results to database', error)
    throw error
  }
}
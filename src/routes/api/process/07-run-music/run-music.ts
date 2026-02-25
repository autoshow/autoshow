import type { Step7Metadata, MusicGenre, MusicServiceType, MusicGenerationOptions, TranscriptionResult, VideoMetadata, IProgressTracker, StructuredOutputProvider, ProcessingOptions } from '~/types'
import { l, err } from '~/utils/logging'
import { runStructuredLLM } from '~/routes/api/process/04-run-llm/run-llm'
import { buildLyricsPrompt } from '~/prompts/music-prompts'
import { runElevenLabsMusic } from './music-services/run-elevenlabs-music'
import { runMinimaxMusic } from './music-services/run-minimax-music'

export const generateMusicTrack = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  genre: MusicGenre,
  outputDir: string,
  llmModel: string | undefined,
  musicService: MusicServiceType,
  musicModel: string,
  musicOptions: MusicGenerationOptions,
  llmService: StructuredOutputProvider | undefined,
  progressTracker?: IProgressTracker,
  jobId?: string
): Promise<{ musicPath: string, lyrics: string, metadata: Step7Metadata }> => {
  const stepNumber = 7

  l('Step 7: Generate Music Track', {
    genre,
    llmModel,
    llmService,
    musicService,
    musicOptions
  })

  let lyrics = '[Inst]\nInstrumental arrangement with no vocals.'
  let lyricsGenerationTime = 0

  if (!musicOptions.musicInstrumental) {
    progressTracker?.updateStepProgress(stepNumber, 10, 'Generating song lyrics')

    const lyricsPrompt = buildLyricsPrompt(metadata, transcription, genre, musicOptions.musicDurationSeconds)

    const lyricsPromptPath = `${outputDir}/music-lyrics-prompt.md`
    await Bun.write(lyricsPromptPath, lyricsPrompt)
    l('Lyrics prompt saved', { path: lyricsPromptPath })

    progressTracker?.updateStepProgress(stepNumber, 20, 'Requesting lyrics from LLM')

    const { response, metadata: llmMetadata } = await runStructuredLLM(
      llmService as StructuredOutputProvider,
      lyricsPrompt,
      llmModel as string,
      ['text'],
      progressTracker
    )
    lyrics = response.text ?? ''
    lyricsGenerationTime = llmMetadata.processingTime

    l('Lyrics generated', {
      generationTime: `${lyricsGenerationTime}ms`,
      length: `${lyrics.length} characters`
    })
  }

  const lyricsPath = `${outputDir}/music-lyrics.txt`
  await Bun.write(lyricsPath, lyrics)
  l('Lyrics saved', { path: lyricsPath })

  progressTracker?.updateStepProgress(stepNumber, 40, 'Starting music composition')

  const generators: Record<MusicServiceType, typeof runElevenLabsMusic> = {
    elevenlabs: runElevenLabsMusic,
    minimax: runMinimaxMusic
  }

  const generator = generators[musicService]
  const { musicPath, metadata: musicMetadata } = await generator(
    lyrics,
    outputDir,
    genre,
    musicModel,
    musicOptions,
    progressTracker,
    jobId
  )

  const finalMetadata: Step7Metadata = {
    ...musicMetadata,
    lyricsGenerationTime
  }

  progressTracker?.completeStep(stepNumber, 'Music generation complete')

  return { musicPath, lyrics, metadata: finalMetadata }
}

export const processMusicGeneration = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  jobId?: string
) => {
  l('Step 7: Music Generation', {
    musicGenEnabled: options.musicGenEnabled,
    musicService: options.musicService,
    selectedMusicGenre: options.selectedMusicGenre
  })

  if (!options.musicGenEnabled || !options.selectedMusicGenre) {
    return undefined
  }

  progressTracker.startStep(7, 'Starting music generation')

  if (!options.musicService || !options.musicModel) {
    err('Music service and model required for music generation')
    throw new Error('Music service and model are required for music generation')
  }
  if (!options.musicPreset) {
    err('Music preset required for music generation')
    throw new Error('Music preset is required for music generation')
  }
  if (!options.musicDurationSeconds) {
    err('Music duration required for music generation')
    throw new Error('Music duration seconds is required for music generation')
  }
  if (options.musicInstrumental === undefined) {
    err('Music instrumental setting required for music generation')
    throw new Error('Music instrumental is required for music generation')
  }

  const musicService = options.musicService
  const musicOptions: MusicGenerationOptions = {
    musicPreset: options.musicPreset,
    musicDurationSeconds: options.musicDurationSeconds,
    musicInstrumental: options.musicInstrumental,
    musicSampleRate: options.musicSampleRate,
    musicBitrate: options.musicBitrate
  }

  if (!musicOptions.musicInstrumental && !options.llmModel) {
    err('LLM model required for lyric music generation')
    throw new Error('LLM model is required for music lyrics generation')
  }

  if (!musicOptions.musicInstrumental && !options.llmService) {
    err('LLM service required for lyric music generation')
    throw new Error('LLM service is required for music lyrics generation')
  }

  const musicResult = await generateMusicTrack(
    metadata,
    transcription,
    options.selectedMusicGenre,
    options.outputDir,
    options.llmModel,
    musicService,
    options.musicModel,
    musicOptions,
    options.llmService as StructuredOutputProvider | undefined,
    progressTracker,
    jobId
  )

  l('Music generation completed', {
    musicService,
    selectedGenre: options.selectedMusicGenre,
    lyricsLength: musicResult.lyrics.length,
    totalCost: `$${musicResult.metadata.totalCost.toFixed(4)}`
  })

  return musicResult.metadata
}

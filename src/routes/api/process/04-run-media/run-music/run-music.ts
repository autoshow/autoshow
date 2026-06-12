import { getDefaultMusicModelForService } from '~/models/models-config/music-config'
import { runStructuredLLM } from '~/routes/api/process/03-write-and-tts/run-llm/run-llm'
import type { IProgressTracker,MusicGenerationOptions,MusicGenre,MusicServiceType,ProcessingOptions,Step7Metadata,StructuredOutputProvider,TranscriptionResult,VideoMetadata } from '~/types'
import { DEFAULT_AUX_LLM } from '~/utils/cost-helpers'
import { l } from '~/utils/logger/logging'
import { STEP_NUMBER } from './music-services/music-helpers'
import { runDeapiMusic } from './music-services/run-deapi-music'
import { runElevenLabsMusic } from './music-services/run-elevenlabs-music'
import { runMinimaxMusic } from './music-services/run-minimax-music'

export const buildLyricsPrompt = (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  genre: MusicGenre,
  targetDurationSeconds: number,
  customInstructions?: string
): string => {
  const genreInstructions: Record<MusicGenre, string> = {
    rap: 'Write rap lyrics with rhythmic flow, clever wordplay, and urban storytelling. Include verses and a catchy hook. The lyrics should have a clear rhyme scheme and be suitable for hip-hop production.',
    rock: 'Write rock lyrics with powerful imagery, emotional depth, and anthemic qualities. Include verses and a memorable chorus. The lyrics should work well with electric guitar-driven music.',
    pop: 'Write pop lyrics that are catchy, relatable, and radio-friendly. Include verses and an infectious chorus with a strong hook. The lyrics should be easy to sing along to.',
    country: 'Write country lyrics with storytelling, heartfelt emotion, and authentic Americana themes. Include verses and a singable chorus. The lyrics should paint vivid pictures and connect with everyday experiences.',
    folk: 'Write folk lyrics with poetic imagery, traditional storytelling, and acoustic sensibility. Include verses and a simple, memorable chorus. The lyrics should feel organic and timeless.',
    jazz: 'Write jazz lyrics with sophisticated wordplay, smooth phrasing, and musical sophistication. Include verses and a melodic chorus. The lyrics should complement improvisation and swing rhythms.'
  }

  const instruction = genreInstructions[genre]
  const wordTarget = targetDurationSeconds <= 30
    ? '40-80'
    : targetDurationSeconds <= 60
      ? '80-140'
      : targetDurationSeconds <= 90
        ? '120-200'
        : targetDurationSeconds <= 120
          ? '160-260'
          : '200-400'

  const trimmedCustomInstructions = customInstructions?.trim()
  const customInstructionBlock = trimmedCustomInstructions
    ? `\nAdditional user instructions:\n${trimmedCustomInstructions}\n`
    : '\n'

  return `Based on the following transcript, write original song lyrics in the ${genre} genre.

${instruction}
${customInstructionBlock}

Video Title: ${metadata.title}
${metadata.author ? `Author: ${metadata.author}` : ''}

Transcript Summary:
${transcription.text.substring(0, 2000)}

Important instructions:
- DO NOT use any copyrighted lyrics or reference specific band/artist names
- Create 100% original lyrics inspired by the themes and topics in the transcript
- Make the lyrics complete with verses and chorus
- Keep the total length to approximately ${wordTarget} words
- The lyrics should be suitable for a ${targetDurationSeconds}-second song
- Write ONLY the lyrics, no additional commentary or explanations

Lyrics:`
}

const MUSIC_FALLBACK_ORDER: MusicServiceType[] = ['elevenlabs', 'minimax', 'deapi']

const MUSIC_API_KEY_MAP: Record<MusicServiceType, string> = {
  elevenlabs: 'ELEVENLABS_API_KEY',
  minimax: 'MINIMAX_API_KEY',
  deapi: 'DEAPI_API_KEY',
}

const hasRequiredMusicApiKey = (service: MusicServiceType): boolean => {
  return !!process.env[MUSIC_API_KEY_MAP[service]]
}

const getNextMusicService = (
  currentService: MusicServiceType,
  triedServices: Set<MusicServiceType>
): MusicServiceType | null => {
  for (const service of MUSIC_FALLBACK_ORDER) {
    if (service === currentService || triedServices.has(service)) continue
    if (hasRequiredMusicApiKey(service)) return service
  }
  return null
}

const MUSIC_RETRY_TIMEOUT_MS = 10 * 60 * 1000

const generateMusicTrack = async (
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
  const stepNumber = STEP_NUMBER

  const stepStartTime = Date.now()
  let lyrics = '[Inst]\nInstrumental arrangement with no vocals.'
  let lyricsGenerationTime = 0
  let lyricsLlmInputTokenCount: number | undefined
  let lyricsLlmOutputTokenCount: number | undefined
  let lyricsLlmCost: number | undefined
  let lyricsLlmCostUsd: number | undefined

  if (!musicOptions.musicInstrumental) {
    progressTracker?.updateStepProgress(stepNumber, 10, 'Generating song lyrics')

    const lyricsPrompt = buildLyricsPrompt(
      metadata,
      transcription,
      genre,
      musicOptions.musicDurationSeconds,
      musicOptions.customInstructions
    )

    const lyricsPromptPath = `${outputDir}/music-lyrics-prompt.md`
    await Bun.write(lyricsPromptPath, lyricsPrompt)

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
    lyricsLlmInputTokenCount = llmMetadata.inputTokenCount
    lyricsLlmOutputTokenCount = llmMetadata.outputTokenCount
    lyricsLlmCost = llmMetadata.totalCost
    lyricsLlmCostUsd = llmMetadata.actualCostUsd

  }

  const lyricsPath = `${outputDir}/music-lyrics.txt`
  await Bun.write(lyricsPath, lyrics)

  progressTracker?.updateStepProgress(stepNumber, 40, 'Starting music composition')

  const generators: Record<MusicServiceType, typeof runElevenLabsMusic> = {
    elevenlabs: runElevenLabsMusic,
    minimax: runMinimaxMusic,
    deapi: runDeapiMusic
  }

  const errors: Array<{ service: string, model: string, error: string }> = []
  const triedServices = new Set<MusicServiceType>()
  const retryStartTime = Date.now()
  let currentMusicService = musicService
  let currentMusicModel = musicModel
  let attemptNumber = 1
  let musicPath: string
  let musicMetadata: Step7Metadata

  while (true) {
    if (Date.now() - retryStartTime > MUSIC_RETRY_TIMEOUT_MS) {
      throw new Error(`Music retry timeout exceeded after ${Math.round((Date.now() - retryStartTime) / 1000)}s: ${errors.map(e => `${e.service}/${e.model}: ${e.error}`).join('; ')}`)
    }

    if (!hasRequiredMusicApiKey(currentMusicService)) {
      triedServices.add(currentMusicService)
      const next = getNextMusicService(currentMusicService, triedServices)
      if (!next) break
      l('[music-fallback] skipping service (no API key)', { skipped: currentMusicService, next })
      currentMusicService = next
      currentMusicModel = getDefaultMusicModelForService(next)
      attemptNumber = 1
      continue
    }

    try {
      if (errors.length > 0) {
        progressTracker?.updateStepProgress(stepNumber, 40, `Retry ${errors.length + 1}: trying ${currentMusicService}/${currentMusicModel}`)
      }

      const generator = generators[currentMusicService]
      const result = await generator(
        lyrics,
        outputDir,
        genre,
        currentMusicModel,
        musicOptions,
        progressTracker,
        jobId
      )

      if (errors.length > 0) {
        l('[music-fallback] succeeded after retries', { service: currentMusicService, model: currentMusicModel, attempts: errors.length + 1 })
      }

      musicPath = result.musicPath
      musicMetadata = result.metadata
      break
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ service: currentMusicService, model: currentMusicModel, error: errorMessage })
      l('[music-fallback] attempt failed', { service: currentMusicService, model: currentMusicModel, attempt: attemptNumber, error: errorMessage })

      if (attemptNumber === 1) {
        attemptNumber = 2
      } else {
        triedServices.add(currentMusicService)
        const next = getNextMusicService(currentMusicService, triedServices)
        if (next) {
          l('[music-fallback] falling back to next service', { from: currentMusicService, to: next })
          currentMusicService = next
          currentMusicModel = getDefaultMusicModelForService(next)
          attemptNumber = 1
        } else {
          break
        }
      }
    }
  }

  if (!musicPath! || !musicMetadata!) {
    throw new Error(`All music attempts failed: ${errors.map(e => `${e.service}/${e.model}: ${e.error}`).join('; ')}`)
  }

  const lyricsCost = lyricsLlmCost ?? 0
  const totalCost = musicMetadata.totalCost + lyricsCost
  const finalMetadata: Step7Metadata = {
    ...musicMetadata,
    processingTime: Date.now() - stepStartTime,
    lyricsGenerationTime,
    totalCost,
    actualCostUsd: totalCost,
    ...(lyricsLlmInputTokenCount != null && { llmInputTokenCount: lyricsLlmInputTokenCount }),
    ...(lyricsLlmOutputTokenCount != null && { llmOutputTokenCount: lyricsLlmOutputTokenCount }),
    ...(lyricsLlmCost != null && { llmCost: lyricsLlmCost }),
    ...(lyricsLlmCostUsd != null && { llmCostUsd: lyricsLlmCostUsd })
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

  if (!options.musicGenEnabled || !options.selectedMusicGenre) {
    return undefined
  }

  progressTracker.startStep(STEP_NUMBER, 'Starting music generation')

  if (!options.musicService || !options.musicModel) {
    throw new Error('Music service and model are required for music generation')
  }
  if (!options.musicPreset) {
    throw new Error('Music preset is required for music generation')
  }
  if (!options.musicDurationSeconds) {
    throw new Error('Music duration seconds is required for music generation')
  }
  if (options.musicInstrumental === undefined) {
    throw new Error('Music instrumental is required for music generation')
  }

  const musicService = options.musicService
  const musicOptions: MusicGenerationOptions = {
    musicPreset: options.musicPreset,
    musicDurationSeconds: options.musicDurationSeconds,
    musicInstrumental: options.musicInstrumental,
    musicSampleRate: options.musicSampleRate,
    musicBitrate: options.musicBitrate,
    customInstructions: options.musicCustomInstructions
  }

  // Resolve the LLM to use for lyrics: user-selected when llmEnabled, otherwise aux fallback
  const auxLlmService = (options.llmEnabled && options.llmService
    ? options.llmService
    : DEFAULT_AUX_LLM.service) as StructuredOutputProvider
  const auxLlmModel = options.llmEnabled && options.llmModel
    ? options.llmModel
    : DEFAULT_AUX_LLM.model

  if (!musicOptions.musicInstrumental && !auxLlmModel) {
    throw new Error('LLM model is required for music lyrics generation')
  }

  const musicResult = await generateMusicTrack(
    metadata,
    transcription,
    options.selectedMusicGenre,
    options.outputDir,
    auxLlmModel,
    musicService,
    options.musicModel,
    musicOptions,
    auxLlmService,
    progressTracker,
    jobId
  )

  return musicResult.metadata
}

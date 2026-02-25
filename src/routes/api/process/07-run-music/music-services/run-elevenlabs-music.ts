import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import type { Step7Metadata, MusicGenre, MusicGenerationOptions, IProgressTracker } from '~/types'
import { MUSIC_CONFIG } from '~/models/music-config'
import { l } from '~/utils/logging'
import { getGenrePromptEnhancement } from '~/prompts/music-prompts'
import { requireEnvKey, handleMusicError, saveMusicFile, buildMusicMetadata } from './music-helpers'

const SERVICE_ID = 'elevenlabs'
const SERVICE_CONFIG = MUSIC_CONFIG[SERVICE_ID]
const SERVICE_NAME = SERVICE_CONFIG.name
const STEP_NUMBER = 7

export const buildElevenLabsMusicPrompt = (
  genre: MusicGenre,
  lyrics: string,
  musicInstrumental: boolean
): string => {
  const genreEnhancement = getGenrePromptEnhancement(genre)
  if (musicInstrumental) {
    return `Create an instrumental ${genre} song ${genreEnhancement}. No vocals and no lyrics.`
  }
  return `Create a ${genre} song ${genreEnhancement}. Use the following lyrics:\n\n${lyrics}`
}

export const getElevenLabsMusicLengthMs = (musicDurationSeconds: number): number => {
  return musicDurationSeconds * 1000
}

export const runElevenLabsMusic = async (
  lyrics: string,
  outputDir: string,
  genre: MusicGenre,
  model: string,
  musicOptions: MusicGenerationOptions,
  progressTracker?: IProgressTracker,
  jobId?: string
): Promise<{ musicPath: string, metadata: Step7Metadata }> => {
  try {
    const apiKey = requireEnvKey('ELEVENLABS_API_KEY')
    const startTime = Date.now()
    l(`Starting ${SERVICE_NAME} music generation`, {
      genre,
      lyricsLength: `${lyrics.length} characters`
    })

    progressTracker?.updateStepProgress(STEP_NUMBER, 20, 'Preparing music composition')

    const prompt = buildElevenLabsMusicPrompt(genre, lyrics, musicOptions.musicInstrumental)

    l(`Sending composition request to ${SERVICE_NAME}`, { genre, promptLength: `${prompt.length} characters` })

    progressTracker?.updateStepProgress(STEP_NUMBER, 40, `Composing music with ${SERVICE_NAME}`)

    const client = new ElevenLabsClient({ apiKey })

    const audioStream = await client.music.compose({
      prompt,
      modelId: model as "music_v1",
      musicLengthMs: getElevenLabsMusicLengthMs(musicOptions.musicDurationSeconds)
    })

    progressTracker?.updateStepProgress(STEP_NUMBER, 70, 'Saving music file')

    const reader = audioStream.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
      }
    }

    const buffer = Buffer.concat(chunks)
    const { musicPath, musicFileName, musicFileSize, musicS3Url } = await saveMusicFile(buffer, outputDir, jobId)

    progressTracker?.updateStepProgress(STEP_NUMBER, 90, 'Calculating music duration')

    const metadata = await buildMusicMetadata(
      SERVICE_ID,
      model,
      genre,
      startTime,
      musicPath,
      musicFileName,
      musicFileSize,
      lyrics,
      musicOptions,
      musicS3Url
    )

    return { musicPath, metadata }
  } catch (error) {
    return handleMusicError(error, SERVICE_NAME, progressTracker)
  }
}

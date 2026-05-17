import { MUSIC_CONFIG } from '~/models/models-config/music-config'
import { getGenrePromptEnhancement } from '~/prompts/music-prompts'
import type { IProgressTracker,MusicGenerationOptions,MusicGenre,Step7Metadata } from '~/types'
import { buildMusicMetadata,handleMusicError,requireEnvKey,saveMusicFile } from './music-helpers'

const SERVICE_ID = 'elevenlabs'
const SERVICE_CONFIG = MUSIC_CONFIG[SERVICE_ID]
const SERVICE_NAME = SERVICE_CONFIG.name
const STEP_NUMBER = 7
const ELEVENLABS_OUTPUT_FORMAT = 'mp3_44100_128'

const buildElevenLabsMusicPrompt = (
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

const getElevenLabsMusicLengthMs = (musicDurationSeconds: number): number => {
  return musicDurationSeconds * 1000
}

const buildElevenLabsMusicUrl = (): string => {
  const url = new URL('https://api.elevenlabs.io/v1/music')
  url.searchParams.set('output_format', ELEVENLABS_OUTPUT_FORMAT)
  return url.toString()
}

const buildElevenLabsMusicRequestBody = (
  prompt: string,
  model: string,
  musicOptions: MusicGenerationOptions
): {
  prompt: string
  model_id: string
  music_length_ms: number
  force_instrumental: boolean
} => {
  return {
    prompt,
    model_id: model,
    music_length_ms: getElevenLabsMusicLengthMs(musicOptions.musicDurationSeconds),
    force_instrumental: musicOptions.musicInstrumental
  }
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

    progressTracker?.updateStepProgress(STEP_NUMBER, 20, 'Preparing music composition')

    const prompt = buildElevenLabsMusicPrompt(genre, lyrics, musicOptions.musicInstrumental)

    progressTracker?.updateStepProgress(STEP_NUMBER, 40, `Composing music with ${SERVICE_NAME}`)

    const response = await fetch(buildElevenLabsMusicUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify(buildElevenLabsMusicRequestBody(prompt, model, musicOptions))
    })

    if (!response.ok) {
      throw new Error(`${SERVICE_NAME} API request failed: ${response.status}`)
    }

    progressTracker?.updateStepProgress(STEP_NUMBER, 70, 'Saving music file')

    const buffer = Buffer.from(await response.arrayBuffer())
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

import { MUSIC_CONFIG } from '~/models/models-config/music-config'
import { getGenrePromptEnhancement } from '~/prompts/music-prompts'
import type { IProgressTracker,MusicGenerationOptions,MusicGenre,MusicPreset,Step7Metadata } from '~/types'
import { buildMusicMetadata,handleMusicError,requireEnvKey,saveMusicFile } from './music-helpers'

const SERVICE_ID = 'minimax'
const SERVICE_CONFIG = MUSIC_CONFIG[SERVICE_ID]
const SERVICE_NAME = SERVICE_CONFIG.name
const STEP_NUMBER = 7
const API_URL = 'https://api.minimax.io/v1/music_generation'
const MAX_LYRICS_LENGTH = 3500
const PRESET_AUDIO_SETTINGS: Record<MusicPreset, { sampleRate: 16000 | 24000 | 32000 | 44100, bitrate: 32000 | 64000 | 128000 | 256000 }> = {
  cheap: { sampleRate: 24000, bitrate: 64000 },
  balanced: { sampleRate: 32000, bitrate: 128000 },
  quality: { sampleRate: 44100, bitrate: 256000 }
}

const getMinimaxAudioSettings = (musicOptions: MusicGenerationOptions): { sampleRate: 16000 | 24000 | 32000 | 44100, bitrate: 32000 | 64000 | 128000 | 256000 } => {
  const presetAudioSetting = PRESET_AUDIO_SETTINGS[musicOptions.musicPreset]
  return {
    sampleRate: musicOptions.musicSampleRate ?? presetAudioSetting.sampleRate,
    bitrate: musicOptions.musicBitrate ?? presetAudioSetting.bitrate
  }
}

const getMinimaxLyricsInput = (lyrics: string, musicInstrumental: boolean): string => {
  if (musicInstrumental) {
    return '[Inst]\nInstrumental performance only, no vocals.'
  }
  return formatLyricsWithStructure(lyrics)
}

const formatLyricsWithStructure = (lyrics: string): string => {
  const lines = lyrics.split('\n').filter(line => line.trim())
  const hasStructureTags = lines.some(line => /^\[.+\]/.test(line.trim()))
  if (hasStructureTags) return lyrics

  const formatted: string[] = []
  let verseCount = 0
  let lineCount = 0

  for (const line of lines) {
    if (lineCount % 4 === 0) {
      if (lineCount > 0 && lineCount % 8 === 0) {
        formatted.push('[Chorus]')
      } else {
        verseCount++
        formatted.push(`[Verse ${verseCount}]`)
      }
    }
    formatted.push(line)
    lineCount++
  }

  return formatted.join('\n')
}

export const runMinimaxMusic = async (
  lyrics: string,
  outputDir: string,
  genre: MusicGenre,
  model: string,
  musicOptions: MusicGenerationOptions,
  progressTracker?: IProgressTracker,
  jobId?: string
): Promise<{ musicPath: string, metadata: Step7Metadata }> => {
  try {
    const apiKey = requireEnvKey('MINIMAX_API_KEY')
    const startTime = Date.now()

    progressTracker?.updateStepProgress(STEP_NUMBER, 20, 'Preparing music composition')

    const genreEnhancement = getGenrePromptEnhancement(genre)
    const formattedLyrics = getMinimaxLyricsInput(lyrics, musicOptions.musicInstrumental)
    const truncatedLyrics = formattedLyrics.length > MAX_LYRICS_LENGTH
      ? formattedLyrics.slice(0, MAX_LYRICS_LENGTH)
      : formattedLyrics
    const { sampleRate, bitrate } = getMinimaxAudioSettings(musicOptions)

    if (formattedLyrics.length > MAX_LYRICS_LENGTH) {
    }

    const prompt = musicOptions.musicInstrumental
      ? `Create an instrumental ${genre} song ${genreEnhancement}. No vocals.`
      : `Create a ${genre} song ${genreEnhancement}`

    progressTracker?.updateStepProgress(STEP_NUMBER, 40, `Composing music with ${SERVICE_NAME}`)

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        lyrics: truncatedLyrics,
        prompt,
        output_format: 'hex',
        audio_setting: {
          format: 'mp3',
          sample_rate: sampleRate,
          bitrate
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`MiniMax API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as {
      data?: { audio_hex?: string; audio_file?: string; audio?: string }
      audio_hex?: string
      audio_file?: string
      audio?: string
      base_resp?: { status_code?: number; status_msg?: string }
    }

    progressTracker?.updateStepProgress(STEP_NUMBER, 70, 'Processing audio data')

    const audioHex = data.data?.audio_hex || data.audio_hex
    const audioFile = data.data?.audio_file || data.audio_file
    const audioBase64 = data.data?.audio || data.audio

    let buffer: Buffer

    if (audioHex) {
      buffer = Buffer.from(audioHex, 'hex')
    } else if (audioFile) {
      const audioResponse = await fetch(audioFile)
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`)
      }
      const audioData = await audioResponse.arrayBuffer()
      buffer = Buffer.from(audioData)
    } else if (audioBase64) {
      buffer = Buffer.from(audioBase64, 'base64')
    } else {
      throw new Error('No audio data in MiniMax response')
    }
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
      { ...musicOptions, musicSampleRate: sampleRate, musicBitrate: bitrate },
      musicS3Url
    )

    return { musicPath, metadata }
  } catch (error) {
    return handleMusicError(error, SERVICE_NAME, progressTracker)
  }
}

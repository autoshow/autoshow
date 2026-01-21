import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { l, err } from '~/utils/logging'
import type { Step7Metadata, MusicGenre } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { getGenrePromptEnhancement } from '~/prompts/music-prompts'

const ELEVENLABS_API_KEY = process.env['ELEVENLABS_API_KEY']

const calculateAudioDuration = async (audioPath: string): Promise<number> => {
  try {
    const result = await Bun.$`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${audioPath}`.text()
    const duration = parseFloat(result.trim())
    return isFinite(duration) ? duration : 0
  } catch (error) {
    err('Failed to calculate audio duration', error)
    return 0
  }
}

export const generateMusic = async (
  lyrics: string,
  outputDir: string,
  genre: MusicGenre,
  progressTracker?: IProgressTracker,
  stepNumber: number = 7
): Promise<{ musicPath: string, metadata: Step7Metadata }> => {
  try {
    if (!ELEVENLABS_API_KEY) {
      err('ELEVENLABS_API_KEY not found in environment')
      progressTracker?.error(stepNumber, 'Configuration error', 'ELEVENLABS_API_KEY environment variable is required')
      throw new Error('ELEVENLABS_API_KEY environment variable is required')
    }

    l('Starting Eleven Music generation', {
      genre,
      lyricsLength: `${lyrics.length} characters`
    })
    
    progressTracker?.updateStepProgress(stepNumber, 20, 'Preparing music composition')
    
    const startTime = Date.now()
    const model = 'music_v1'
    
    const genreEnhancement = getGenrePromptEnhancement(genre)
    const prompt = `Create a ${genre} song ${genreEnhancement}. Use the following lyrics:\n\n${lyrics}`
    
    l('Sending composition request to Eleven Music', { genre, promptLength: `${prompt.length} characters` })
    
    progressTracker?.updateStepProgress(stepNumber, 40, 'Composing music with Eleven Music')
    
    const client = new ElevenLabsClient({
      apiKey: ELEVENLABS_API_KEY
    })
    
    const audioStream = await client.music.compose({
      prompt,
      modelId: model,
      musicLengthMs: 180000
    })
    
    progressTracker?.updateStepProgress(stepNumber, 70, 'Saving music file')
    
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
    const musicFileName = 'music.mp3'
    const musicPath = `${outputDir}/${musicFileName}`
    
    await Bun.write(musicPath, buffer)
    
    const musicFile = Bun.file(musicPath)
    const musicFileSize = musicFile.size
    
    l('Music file created', { fileName: musicFileName, size: `${musicFileSize} bytes` })
    
    progressTracker?.updateStepProgress(stepNumber, 90, 'Calculating music duration')
    
    const musicDuration = await calculateAudioDuration(musicPath)
    const processingTime = Date.now() - startTime
    
    l('Music generation completed', {
      processingTime: `${processingTime}ms`,
      musicDuration: `${musicDuration.toFixed(2)}s`
    })
    
    const metadata: Step7Metadata = {
      musicService: 'elevenlabs',
      musicModel: model,
      selectedGenre: genre,
      processingTime,
      musicFileName,
      musicFileSize,
      musicDuration,
      lyricsLength: lyrics.length,
      lyricsGenerationTime: 0,
      lyricsText: lyrics
    }
    
    return { musicPath, metadata }
  } catch (error) {
    err('Failed to generate music with Eleven Music', error)
    progressTracker?.error(stepNumber, 'Music generation failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

export const checkElevenMusicHealth = async (): Promise<boolean> => {
  try {
    if (!ELEVENLABS_API_KEY) {
      err('ELEVENLABS_API_KEY not found in environment')
      return false
    }

    return true
  } catch (error) {
    err('Eleven Music health check failed', error)
    return false
  }
}
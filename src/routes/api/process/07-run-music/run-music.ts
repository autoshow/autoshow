import type { Step7Metadata, MusicGenre } from '~/types/main'
import type { TranscriptionResult } from '~/types/main'
import type { VideoMetadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { l } from '~/utils/logging'
import { runOpenAIModel } from '~/routes/api/process/04-run-llm/llm-services/run-chatgpt'
import { generateMusic } from './music-services/run-elevenlabs-music'
import { buildLyricsPrompt } from '~/prompts/music-prompts'

export const generateMusicTrack = async (
  metadata: VideoMetadata,
  transcription: TranscriptionResult,
  genre: MusicGenre,
  outputDir: string,
  llmModel: string,
  progressTracker?: IProgressTracker
): Promise<{ musicPath: string, lyrics: string, metadata: Step7Metadata }> => {
  const stepNumber = 7
  
  l('Step 7: Generate Music Track', {
    genre,
    llmModel
  })
  
  progressTracker?.updateStepProgress(stepNumber, 10, 'Generating song lyrics')
  
  const lyricsPrompt = buildLyricsPrompt(metadata, transcription, genre)
  
  const lyricsPromptPath = `${outputDir}/music-lyrics-prompt.md`
  await Bun.write(lyricsPromptPath, lyricsPrompt)
  l('Lyrics prompt saved', { path: lyricsPromptPath })
  
  progressTracker?.updateStepProgress(stepNumber, 20, 'Requesting lyrics from LLM')
  
  const lyricsStartTime = Date.now()
  const { response: lyrics } = await runOpenAIModel(lyricsPrompt, llmModel, progressTracker)
  const lyricsGenerationTime = Date.now() - lyricsStartTime
  
  l('Lyrics generated', {
    generationTime: `${lyricsGenerationTime}ms`,
    length: `${lyrics.length} characters`
  })
  
  const lyricsPath = `${outputDir}/music-lyrics.txt`
  await Bun.write(lyricsPath, lyrics)
  l('Lyrics saved', { path: lyricsPath })
  
  progressTracker?.updateStepProgress(stepNumber, 40, 'Starting music composition')
  
  const { musicPath, metadata: musicMetadata } = await generateMusic(
    lyrics,
    outputDir,
    genre,
    progressTracker,
    stepNumber
  )
  
  const finalMetadata: Step7Metadata = {
    ...musicMetadata,
    lyricsGenerationTime
  }
  
  progressTracker?.completeStep(stepNumber, 'Music generation complete')
  
  return { musicPath, lyrics, metadata: finalMetadata }
}
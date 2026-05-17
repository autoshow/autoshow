import { getGenrePromptEnhancement } from '~/prompts/music-prompts'
import type { IProgressTracker,MusicGenerationOptions,MusicGenre,Step7Metadata } from '~/types'
import { calculateDeapiPrice,createDeapiJob,downloadDeapiResult,pollDeapiJob } from '~/utils/deapi-jobs'
import { buildMusicMetadata,handleMusicError,saveMusicFile } from './music-helpers'

const SERVICE_ID = 'deapi'
const SERVICE_NAME = 'deAPI'
const STEP_NUMBER = 7
const DEAPI_MUSIC_MODEL_ALIASES: Record<string, string> = {
  'ACE-Step-v1.5-turbo': 'AceStep_1_5_Turbo'
}

const getDeapiMusicRequestOptions = (model: string): { guidanceScale: number; inferenceSteps: number } => {
  if (model === 'AceStep_1_5_Turbo') {
    return {
      guidanceScale: 1,
      inferenceSteps: 8
    }
  }

  return {
    guidanceScale: 7,
    inferenceSteps: 32
  }
}

const BPM_BY_GENRE: Record<MusicGenre, number> = {
  pop: 115,
  rock: 110,
  rap: 90,
  country: 95,
  folk: 90,
  jazz: 120,
  electronic: 125
}

export const runDeapiMusic = async (
  lyrics: string,
  outputDir: string,
  genre: MusicGenre,
  model: string,
  musicOptions: MusicGenerationOptions,
  progressTracker?: IProgressTracker,
  jobId?: string
): Promise<{ musicPath: string, metadata: Step7Metadata }> => {
  try {
    const startTime = Date.now()
    const genreEnhancement = getGenrePromptEnhancement(genre)
    const resolvedModel = DEAPI_MUSIC_MODEL_ALIASES[model] ?? model
    const { guidanceScale, inferenceSteps } = getDeapiMusicRequestOptions(resolvedModel)
    const caption = musicOptions.musicInstrumental
      ? `Create an instrumental ${genre} track ${genreEnhancement}.`
      : `Create a ${genre} song ${genreEnhancement}.`
    const requestBody = new FormData()
    requestBody.append('caption', caption)
    requestBody.append('model', resolvedModel)
    requestBody.append('duration', String(musicOptions.musicDurationSeconds))
    requestBody.append('inference_steps', String(inferenceSteps))
    requestBody.append('guidance_scale', String(guidanceScale))
    requestBody.append('seed', '-1')
    requestBody.append('format', 'mp3')
    requestBody.append('lyrics', musicOptions.musicInstrumental ? '[Instrumental]' : lyrics)
    requestBody.append('bpm', String(BPM_BY_GENRE[genre]))
    requestBody.append('keyscale', 'C major')
    requestBody.append('timesignature', '4')

    if (!musicOptions.musicInstrumental) {
      requestBody.append('vocal_language', 'en')
    }

    progressTracker?.updateStepProgress(STEP_NUMBER, 45, 'Submitting music job to deAPI')

    const totalCostOverride = await calculateDeapiPrice(
      '/api/v1/client/txt2music/price-calculation',
      {
        model: resolvedModel,
        duration: musicOptions.musicDurationSeconds,
        inference_steps: inferenceSteps
      },
      'music generation'
    )
    const requestId = await createDeapiJob('/api/v1/client/txt2music', requestBody, 'music generation')

    const status = await pollDeapiJob(requestId, 'music generation', progressTracker, {
      stepNumber: STEP_NUMBER,
      progressStart: 50,
      progressEnd: 80,
      progressLabel: 'Composing music with deAPI'
    })

    const resultUrl = status.data.result_url
    if (!resultUrl) {
      throw new Error('deAPI music generation completed without result URL')
    }

    const buffer = await downloadDeapiResult(resultUrl, 'music generation')
    const { musicPath, musicFileName, musicFileSize, musicS3Url } = await saveMusicFile(buffer, outputDir, jobId)

    progressTracker?.updateStepProgress(STEP_NUMBER, 90, 'Calculating music duration')

    const metadata = await buildMusicMetadata(
      SERVICE_ID,
      resolvedModel,
      genre,
      startTime,
      musicPath,
      musicFileName,
      musicFileSize,
      lyrics,
      musicOptions,
      musicS3Url,
      totalCostOverride
    )

    return { musicPath, metadata }
  } catch (error) {
    return handleMusicError(error, SERVICE_NAME, progressTracker)
  }
}

import { basename,join } from 'node:path'
import { readdir } from 'node:fs/promises'
import type { IProgressTracker,ProcessingOptions,Step2Metadata,TranscriptionResult,VideoMetadata } from '~/types'
import { executeCommand } from '~/routes/api/process/01-dl-audio/dl-utils'
import { isEnglishCaptionLanguage,type YouTubeCaptionTrack } from '~/routes/api/process/01-dl-audio/video/youtube-captions'
import { resolveYouTubeVideoInfo } from '~/routes/api/process/01-dl-audio/video/youtube-video-info'
import { requirePublicHttpUrl } from '~/utils/security/security-config'
import { countTokens,formatTranscriptOutput } from '../transcription-helpers'
import { parseYouTubeCaptionContent } from './parse-youtube-captions'

const NO_CAPTIONS_ERROR = 'YouTube captions are not available for this video. Please choose a paid streaming transcription provider and try again.'
const EMPTY_CAPTIONS_ERROR = 'The selected YouTube caption track is empty or unreadable. Please choose a paid streaming transcription provider and try again.'

const getCaptionExtension = (path: string): YouTubeCaptionTrack['ext'] | null => {
  if (path.endsWith('.json3')) return 'json3'
  if (path.endsWith('.vtt')) return 'vtt'
  return null
}

const findDownloadedCaptionPath = async (
  outputDir: string,
  prefix: string
): Promise<{ path: string, ext: YouTubeCaptionTrack['ext'] } | null> => {
  const entries = await readdir(outputDir)
  const candidates = entries
    .map(entry => {
      if (!entry.startsWith(prefix)) return null
      const ext = getCaptionExtension(entry)
      return ext ? { path: join(outputDir, entry), ext } : null
    })
    .filter((entry): entry is { path: string, ext: YouTubeCaptionTrack['ext'] } => !!entry)
    .sort((left, right) => {
      if (left.ext === right.ext) return left.path.localeCompare(right.path)
      return left.ext === 'json3' ? -1 : 1
    })

  return candidates[0] ?? null
}

const downloadYouTubeCaptionTrack = async (
  url: string,
  outputDir: string,
  track: YouTubeCaptionTrack
): Promise<{ path: string, ext: YouTubeCaptionTrack['ext'] }> => {
  const outputPrefix = `youtube-captions-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const outputTemplate = join(outputDir, `${outputPrefix}.%(ext)s`)
  const result = await executeCommand('yt-dlp', [
    '--skip-download',
    track.source === 'manual' ? '--write-subs' : '--write-auto-subs',
    '--sub-langs',
    track.language,
    '--sub-format',
    'json3/vtt/best',
    '--no-playlist',
    '--no-warnings',
    '--quiet',
    '--output',
    outputTemplate,
    url
  ])

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || NO_CAPTIONS_ERROR)
  }

  const downloaded = await findDownloadedCaptionPath(outputDir, basename(outputPrefix))
  if (!downloaded) {
    throw new Error(NO_CAPTIONS_ERROR)
  }

  return downloaded
}

export const transcribeWithYouTubeCaptions = async (
  url: string,
  _metadata: VideoMetadata,
  options: ProcessingOptions,
  progressTracker: IProgressTracker,
  model: string
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  try {
    const startTime = Date.now()

    progressTracker.updateStepProgress(2, 10, 'Checking YouTube captions')
    const safeUrl = await requirePublicHttpUrl(url, 'YouTube URL')
    const videoInfo = await resolveYouTubeVideoInfo(safeUrl, {
      includeCaptions: true,
      forceRefresh: true
    })
    const track = videoInfo?.captionTrack

    if (!track) {
      throw new Error(NO_CAPTIONS_ERROR)
    }

    progressTracker.updateStepProgress(2, 30, 'Downloading YouTube caption track')
    const captionFile = await downloadYouTubeCaptionTrack(safeUrl, options.outputDir, track)

    progressTracker.updateStepProgress(2, 70, 'Parsing YouTube captions')
    const captionContent = await Bun.file(captionFile.path).text()
    const transcription = parseYouTubeCaptionContent(captionContent, captionFile.ext, {
      dedupe: track.source === 'automatic'
    })

    if (transcription.segments.length === 0 || transcription.text.trim().length === 0) {
      throw new Error(EMPTY_CAPTIONS_ERROR)
    }

    const outputPath = `${options.outputDir}/transcription.txt`
    await Bun.write(outputPath, formatTranscriptOutput(transcription.segments))

    progressTracker.completeStep(2, isEnglishCaptionLanguage(track.language)
      ? 'YouTube captions imported'
      : `YouTube captions imported in ${track.languageName ?? track.language}`)

    const step2Metadata: Step2Metadata = {
      transcriptionService: 'youtube',
      transcriptionModel: model,
      processingTime: Date.now() - startTime,
      tokenCount: countTokens(transcription.text),
      totalCost: 0,
      actualCostUsd: 0,
      transcriptionLanguage: track.language,
      ...(track.languageName ? { transcriptionLanguageName: track.languageName } : {}),
      captionSource: track.source
    }

    return {
      result: transcription,
      metadata: step2Metadata
    }
  } catch (error) {
    progressTracker.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

import * as v from 'valibot'
import { l, err } from '~/utils/logging'
import { countTokens } from '~/utils/audio'
import type { TranscriptionResult, Step2Metadata, IProgressTracker } from '~/types'
import { DeepgramResponseSchema } from '~/types'
import { parseDeepgramOutput } from './parse-deepgram-output'
import { formatTranscriptOutput } from '../transcription-helpers'

const DEEPGRAM_API_KEY = process.env['DEEPGRAM_API_KEY']
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen'

const getContentType = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
    case 'flac':
      return 'audio/flac'
    case 'm4a':
      return 'audio/mp4'
    case 'ogg':
      return 'audio/ogg'
    case 'webm':
      return 'audio/webm'
    default:
      return 'application/octet-stream'
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const transcribeAudio = async (
  audioPath: string,
  model: string,
  apiKey: string,
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<v.InferOutput<typeof DeepgramResponseSchema>> => {
  const audioFile = Bun.file(audioPath)
  const audioBuffer = await audioFile.arrayBuffer()
  const contentType = getContentType(audioPath)

  const params = new URLSearchParams({
    model,
    diarize: 'true',
    smart_format: 'true',
    utterances: 'true'
  })

  const url = `${DEEPGRAM_API_URL}?${params.toString()}`

  let lastError: Error | null = null
  const maxRetries = 3
  const baseDelay = 1000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      progressTracker?.updateStepProgress(
        2,
        baseProgress + 30 + (attempt * 10),
        attempt > 0 ? `Retrying Deepgram request (attempt ${attempt + 1})` : 'Sending audio to Deepgram'
      )

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': contentType
        },
        body: audioBuffer
      })

      if (response.status === 429 || response.status >= 500) {
        const responseText = await response.text()
        lastError = new Error(`Deepgram API error ${response.status}: ${responseText}`)

        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt)
          const cappedDelay = Math.min(delay, 30000)
          l(`Deepgram rate limited or server error, retrying in ${cappedDelay}ms`, {
            status: response.status,
            attempt: attempt + 1
          })
          await sleep(cappedDelay)
          continue
        }
        throw lastError
      }

      if (!response.ok) {
        const responseText = await response.text()
        throw new Error(`Deepgram API error ${response.status}: ${responseText}`)
      }

      const data = await response.json()
      return v.parse(DeepgramResponseSchema, data)
    } catch (error) {
      if (error instanceof v.ValiError) {
        throw error
      }
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        const cappedDelay = Math.min(delay, 30000)
        l(`Deepgram request failed, retrying in ${cappedDelay}ms`, {
          error: lastError.message,
          attempt: attempt + 1
        })
        await sleep(cappedDelay)
      }
    }
  }

  throw lastError || new Error('Deepgram transcription failed after all retries')
}

export const transcribeWithDeepgram = async (
  audioPath: string,
  outputDir: string,
  segmentOffsetMinutes: number = 0,
  segmentNumber?: number,
  totalSegments?: number,
  model: string = 'nova-3',
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<{ result: TranscriptionResult; metadata: Step2Metadata }> => {
  try {
    if (!DEEPGRAM_API_KEY) {
      err('DEEPGRAM_API_KEY not found in environment')
      progressTracker?.error(2, 'Configuration error', 'DEEPGRAM_API_KEY environment variable is required')
      throw new Error('DEEPGRAM_API_KEY environment variable is required')
    }

    const startTime = Date.now()

    if (segmentNumber && totalSegments) {
      progressTracker?.updateStepWithSubStep(
        2,
        segmentNumber,
        totalSegments,
        `Segment ${segmentNumber}/${totalSegments}`,
        `Transcribing audio segment ${segmentNumber}/${totalSegments} with Deepgram`
      )
    } else {
      progressTracker?.updateStepProgress(2, baseProgress + 10, 'Starting Deepgram transcription')
    }

    const response = await transcribeAudio(audioPath, model, DEEPGRAM_API_KEY, progressTracker, baseProgress)

    progressTracker?.updateStepProgress(2, baseProgress + 85, 'Processing Deepgram response')

    const transcription = parseDeepgramOutput(response, segmentOffsetMinutes)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const outputPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    if (!segmentNumber) {
      progressTracker?.completeStep(2, 'Deepgram transcription complete')
    }

    const metadata: Step2Metadata = {
      transcriptionService: 'deepgram',
      transcriptionModel: model,
      processingTime,
      tokenCount
    }

    l('Deepgram transcription completed', {
      processingTimeMs: processingTime,
      tokenCount,
      transcriptLength: transcription.text.length,
      segmentCount: transcription.segments.length,
      outputPath,
      segmentNumber,
      totalSegments
    })

    return {
      result: transcription,
      metadata
    }
  } catch (error) {
    err('Failed to transcribe with Deepgram', error)
    progressTracker?.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

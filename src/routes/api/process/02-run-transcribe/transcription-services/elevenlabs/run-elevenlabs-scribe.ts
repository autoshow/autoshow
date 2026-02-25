import { l, err } from '~/utils/logging'
import { countTokens } from '~/utils/audio'
import type { TranscriptionResult, Step2Metadata, IProgressTracker } from '~/types'
import { ElevenLabsScribeResponseSchema, validateOrThrow } from '~/types'
import { parseElevenLabsOutput } from './parse-elevenlabs-output'
import { formatTranscriptOutput } from '../transcription-helpers'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io'
const ELEVENLABS_API_KEY = process.env['ELEVENLABS_API_KEY']

export const transcribeWithElevenLabs = async (
  audioPath: string,
  outputDir: string,
  segmentOffsetMinutes: number = 0,
  segmentNumber?: number,
  totalSegments?: number,
  model: string = 'scribe_v2',
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  try {
    if (!ELEVENLABS_API_KEY) {
      err('ELEVENLABS_API_KEY not found in environment')
      progressTracker?.error(2, 'Configuration error', 'ELEVENLABS_API_KEY environment variable is required')
      throw new Error('ELEVENLABS_API_KEY environment variable is required')
    }

    const startTime = Date.now()

    if (segmentNumber && totalSegments) {
      progressTracker?.updateStepWithSubStep(
        2,
        segmentNumber,
        totalSegments,
        `Segment ${segmentNumber}/${totalSegments}`,
        `Uploading audio segment ${segmentNumber}/${totalSegments} to ElevenLabs`
      )
    } else {
      progressTracker?.updateStepProgress(2, baseProgress + 10, 'Uploading audio to ElevenLabs')
    }

    const audioFile = Bun.file(audioPath)
    const audioBuffer = await audioFile.arrayBuffer()
    const fileName = audioPath.split('/').pop() || 'audio.wav'

    const formData = new FormData()
    formData.append('file', new Blob([audioBuffer]), fileName)
    formData.append('model_id', model)
    formData.append('diarize', 'true')
    formData.append('tag_audio_events', 'true')

    progressTracker?.updateStepProgress(2, baseProgress + 30, 'Transcribing with ElevenLabs Scribe')

    const apiResponse = await fetch(`${ELEVENLABS_API_BASE}/v1/speech-to-text`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: formData
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      err(`ElevenLabs transcription failed. Status: ${apiResponse.status}`, { error: errorText })
      throw new Error(`ElevenLabs transcription failed: ${apiResponse.statusText} - ${errorText}`)
    }

    progressTracker?.updateStepProgress(2, baseProgress + 80, 'Processing ElevenLabs response')

    const rawData = await apiResponse.json()
    const response = validateOrThrow(ElevenLabsScribeResponseSchema, rawData, 'Invalid ElevenLabs Scribe response')

    progressTracker?.updateStepProgress(2, baseProgress + 90, 'Parsing ElevenLabs transcription')

    const transcription = parseElevenLabsOutput(response, segmentOffsetMinutes)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const outputPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    if (!segmentNumber) {
      progressTracker?.completeStep(2, 'ElevenLabs transcription complete')
    }

    const metadata: Step2Metadata = {
      transcriptionService: 'elevenlabs',
      transcriptionModel: model,
      processingTime,
      tokenCount
    }

    l('ElevenLabs transcription completed', {
      processingTimeMs: processingTime,
      tokenCount,
      transcriptLength: transcription.text.length,
      segmentCount: transcription.segments.length,
      outputPath,
      segmentNumber,
      totalSegments,
      language: response.language_code
    })

    return {
      result: transcription,
      metadata
    }
  } catch (error) {
    err('Failed to transcribe with ElevenLabs', error)
    progressTracker?.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

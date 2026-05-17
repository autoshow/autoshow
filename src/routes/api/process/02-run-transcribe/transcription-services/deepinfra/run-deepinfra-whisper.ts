import type { SourceRoutesApiProcess02RunTranscribeTranscriptionServicesDeepinfraRunDeepinfraWhisperBuildDeepInfraTranscriptionMetadataOptions as BuildDeepInfraTranscriptionMetadataOptions,SourceRoutesApiProcess02RunTranscribeTranscriptionServicesDeepinfraParseDeepinfraOutputDeepInfraNativeResponse as DeepInfraNativeResponse,IProgressTracker,Step2Metadata,TranscriptionResult } from '~/types'
import {
calculateActualCostUsd,countTokens,formatTranscriptOutput,
resolveTranscriptionDurationSeconds
} from '../transcription-helpers'
import { parseDeepInfraOutput } from './parse-deepinfra-output'

const DEEPINFRA_API_KEY = process.env['DEEPINFRA_API_KEY']

const buildDeepInfraTranscriptionMetadata = ({
  model,
  processingTime,
  tokenCount,
  totalCost,
  durationSeconds,
}: BuildDeepInfraTranscriptionMetadataOptions): Step2Metadata => {
  const actualCostUsd = calculateActualCostUsd('deepinfra', model, durationSeconds)

  return {
    transcriptionService: 'deepinfra',
    transcriptionModel: model,
    processingTime,
    tokenCount,
    ...(totalCost != null ? { totalCost } : {}),
    ...(actualCostUsd != null ? { actualCostUsd } : {}),
  }
}

export const transcribeWithDeepInfra = async (
  audioPath: string,
  outputDir: string,
  segmentOffsetMinutes: number = 0,
  segmentNumber?: number,
  totalSegments?: number,
  model: string = 'openai/whisper-large-v3-turbo',
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  try {
    if (!DEEPINFRA_API_KEY) {
      progressTracker?.error(2, 'Configuration error', 'DEEPINFRA_API_KEY environment variable is required')
      throw new Error('DEEPINFRA_API_KEY environment variable is required')
    }

    if (segmentNumber && totalSegments) {
      progressTracker?.updateStepWithSubStep(2, segmentNumber, totalSegments, `Segment ${segmentNumber}/${totalSegments}`, `Transcribing segment ${segmentNumber} of ${totalSegments}`)
    } else {
      progressTracker?.updateStepProgress(2, baseProgress + 10, 'Preparing transcription')
    }

    const startTime = Date.now()

    progressTracker?.updateStepProgress(2, baseProgress + 20, 'Sending audio to DeepInfra')

    const audioFile = Bun.file(audioPath)
    const durationSecondsPromise = resolveTranscriptionDurationSeconds(undefined, audioPath)
    const formData = new FormData()
    formData.append('audio', audioFile)

    const response = await fetch(`https://api.deepinfra.com/v1/inference/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${DEEPINFRA_API_KEY}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepInfra API error (${response.status}): ${errorText}`)
    }

    const data = await response.json() as DeepInfraNativeResponse

    progressTracker?.updateStepProgress(2, baseProgress + 80, 'Processing transcription results')

    const transcription = parseDeepInfraOutput(data, segmentOffsetMinutes)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)
    const durationSeconds = await durationSecondsPromise

    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const outputPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    if (!segmentNumber) {
      progressTracker?.completeStep(2, 'Transcription complete')
    }

    const metadata = buildDeepInfraTranscriptionMetadata({
      model,
      processingTime,
      tokenCount,
      totalCost: transcription.cost,
      durationSeconds,
    })

    return {
      result: transcription,
      metadata
    }
  } catch (error) {
    progressTracker?.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

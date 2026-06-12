import type { SourceRoutesApiProcess02RunTranscribeTranscriptionServicesAssemblyRunAssemblyBuildAssemblyTranscriptionMetadataOptions as BuildAssemblyTranscriptionMetadataOptions,IProgressTracker,Step2Metadata,TranscriptionResult } from '~/types'
import { calculateActualCostUsd,countTokens,formatTranscriptOutput } from '../transcription-helpers'
import { createAssemblyTranscription } from './create-transcription'
import { parseAssemblyOutput } from './parse-assembly-output'
import { pollAssemblyTranscription } from './poll-transcription'
import { uploadAudioToAssembly } from './upload-audio'

const ASSEMBLYAI_API_KEY = process.env['ASSEMBLYAI_API_KEY']

const buildAssemblyTranscriptionMetadata = ({
  model,
  processingTime,
  tokenCount,
  audioDurationSeconds,
}: BuildAssemblyTranscriptionMetadataOptions): Step2Metadata => {
  const actualCostUsd = calculateActualCostUsd('assembly', model, audioDurationSeconds)

  return {
    transcriptionService: 'assembly',
    transcriptionModel: model,
    processingTime,
    tokenCount,
    ...(actualCostUsd != null ? { actualCostUsd } : {}),
  }
}

export const transcribeWithAssembly = async (
  audioPath: string,
  outputDir: string,
  segmentOffsetMinutes: number = 0,
  segmentNumber?: number,
  totalSegments?: number,
  model: string = 'universal-3-pro',
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<{ result: TranscriptionResult; metadata: Step2Metadata }> => {
  try {
    if (!ASSEMBLYAI_API_KEY) {
      progressTracker?.error(2, 'Configuration error', 'ASSEMBLYAI_API_KEY environment variable is required')
      throw new Error('ASSEMBLYAI_API_KEY environment variable is required')
    }

    const startTime = Date.now()

    if (segmentNumber && totalSegments) {
      progressTracker?.updateStepWithSubStep(
        2,
        segmentNumber,
        totalSegments,
        `Segment ${segmentNumber}/${totalSegments}`,
        `Uploading audio segment ${segmentNumber}/${totalSegments} to AssemblyAI`
      )
    } else {
      progressTracker?.updateStepProgress(2, baseProgress + 5, 'Uploading audio to AssemblyAI')
    }

    const uploadUrl = await uploadAudioToAssembly(audioPath, ASSEMBLYAI_API_KEY)

    progressTracker?.updateStepProgress(2, baseProgress + 15, 'Creating AssemblyAI transcription job')

    const transcriptId = await createAssemblyTranscription(uploadUrl, model, ASSEMBLYAI_API_KEY)

    progressTracker?.updateStepProgress(2, baseProgress + 20, 'Waiting for AssemblyAI transcription')

    const transcript = await pollAssemblyTranscription(
      transcriptId,
      ASSEMBLYAI_API_KEY,
      progressTracker,
      baseProgress
    )

    progressTracker?.updateStepProgress(2, baseProgress + 85, 'Processing AssemblyAI response')

    const transcription = parseAssemblyOutput(transcript, segmentOffsetMinutes)

    const processingTime = Date.now() - startTime
    const tokenCount = countTokens(transcription.text)

    const segmentSuffix = segmentNumber ? `_segment_${String(segmentNumber).padStart(3, '0')}` : ''
    const outputPath = `${outputDir}/transcription${segmentSuffix}.txt`
    const formattedTranscript = formatTranscriptOutput(transcription.segments)
    await Bun.write(outputPath, formattedTranscript)

    if (!segmentNumber) {
      progressTracker?.completeStep(2, 'AssemblyAI transcription complete')
    }

    const metadata = buildAssemblyTranscriptionMetadata({
      model,
      processingTime,
      tokenCount,
      audioDurationSeconds: transcript.audio_duration ?? undefined,
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

import { l, err } from '~/utils/logging'
import { countTokens } from '~/utils/audio'
import type { TranscriptionResult, Step2Metadata, IProgressTracker } from '~/types'
import { uploadAudioToAssembly } from './upload-audio'
import { createAssemblyTranscription } from './create-transcription'
import { pollAssemblyTranscription } from './poll-transcription'
import { parseAssemblyOutput } from './parse-assembly-output'
import { formatTranscriptOutput } from '../transcription-helpers'

const ASSEMBLYAI_API_KEY = process.env['ASSEMBLYAI_API_KEY']

export const transcribeWithAssembly = async (
  audioPath: string,
  outputDir: string,
  segmentOffsetMinutes: number = 0,
  segmentNumber?: number,
  totalSegments?: number,
  model: string = 'universal',
  progressTracker?: IProgressTracker,
  baseProgress: number = 0
): Promise<{ result: TranscriptionResult; metadata: Step2Metadata }> => {
  try {
    if (!ASSEMBLYAI_API_KEY) {
      err('ASSEMBLYAI_API_KEY not found in environment')
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

    const metadata: Step2Metadata = {
      transcriptionService: 'assembly',
      transcriptionModel: model,
      processingTime,
      tokenCount
    }

    l('AssemblyAI transcription completed', {
      processingTimeMs: processingTime,
      tokenCount,
      transcriptLength: transcription.text.length,
      segmentCount: transcription.segments.length,
      outputPath,
      segmentNumber,
      totalSegments,
      transcriptId
    })

    return {
      result: transcription,
      metadata
    }
  } catch (error) {
    err('Failed to transcribe with AssemblyAI', error)
    progressTracker?.error(2, 'Transcription failed', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

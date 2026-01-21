import type { ProcessingOptions, VideoMetadata } from '~/types/main'
import type { TranscriptionResult, Step2Metadata } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { l } from '~/utils/logging'
import { parseHappyScribeOutput, downloadTranscript } from './parse-happyscribe-output'
import { createTranscription, pollTranscriptionStatus } from './create-transcription'
import { createExport, pollExportStatus } from './create-export'

const countTokens = (text: string): number => {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

export const transcribeWithHappyScribe = async (
  url: string,
  metadata: VideoMetadata,
  options: ProcessingOptions,
  progressTracker: IProgressTracker
): Promise<{ result: TranscriptionResult, metadata: Step2Metadata }> => {
  const startTime = Date.now()
  
  progressTracker.updateStepProgress(2, 10, 'Creating HappyScribe transcription job')
  
  const transcriptionId = await createTranscription(url, metadata.title)
  
  progressTracker.updateStepProgress(2, 20, 'Waiting for transcription to complete')
  
  await pollTranscriptionStatus(transcriptionId, progressTracker)
  
  progressTracker.updateStepProgress(2, 70, 'Creating export')
  
  const exportId = await createExport(transcriptionId)
  
  progressTracker.updateStepProgress(2, 80, 'Waiting for export')
  
  const downloadUrl = await pollExportStatus(exportId)
  
  progressTracker.updateStepProgress(2, 90, 'Downloading transcription')
  
  const transcriptJson = await downloadTranscript(downloadUrl)
  
  progressTracker.updateStepProgress(2, 95, 'Parsing transcription')
  
  const transcription = parseHappyScribeOutput(transcriptJson)
  
  const processingTime = Date.now() - startTime
  const tokenCount = countTokens(transcription.text)
  
  const outputPath = `${options.outputDir}/transcription-happyscribe.txt`
  const formattedTranscript = transcription.segments
    .map(seg => {
      const speakerPrefix = seg.speaker ? `[${seg.speaker}] ` : ''
      return `[${seg.start}] ${speakerPrefix}${seg.text}`
    })
    .join('\n')
  
  await Bun.write(outputPath, formattedTranscript)
  
  progressTracker.completeStep(2, 'Transcription complete')
  
  const step2Metadata: Step2Metadata = {
    transcriptionService: 'happyscribe',
    transcriptionModel: 'happyscribe-auto',
    processingTime,
    tokenCount
  }
  
  l('HappyScribe transcription completed', {
    processingTimeMs: processingTime,
    tokenCount,
    transcriptLength: transcription.text.length,
    segmentCount: transcription.segments.length,
    outputPath
  })
  
  return {
    result: transcription,
    metadata: step2Metadata
  }
}
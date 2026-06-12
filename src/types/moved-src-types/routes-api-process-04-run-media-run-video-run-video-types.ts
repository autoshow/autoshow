import type { runStructuredLLM } from '~/routes/api/process/03-write-and-tts/run-llm/run-llm'
import type {
GenerateVideoResult,
IProgressTracker,
VideoGenServiceType,
VideoModel,
VideoPromptType,
VideoSize
} from '~/types'

export type SourceRoutesApiProcess04RunMediaRunVideoRunVideoVideoGenerationDependencyGenerator = (
  prompt: string,
  model: VideoModel,
  size: VideoSize,
  duration: number,
  outputDir: string,
  videoType: VideoPromptType,
  progressTracker?: IProgressTracker,
  stepNumber?: number,
  progressStart?: number,
  progressEnd?: number,
  aspectRatio?: string,
  jobId?: string
) => Promise<GenerateVideoResult & { s3Url?: string, actualCost?: number }>

export type SourceRoutesApiProcess04RunMediaRunVideoRunVideoVideoGenerationDependencies = {
  runSceneLlm: typeof runStructuredLLM
  getVideoGenerator: (
    service: VideoGenServiceType
  ) => SourceRoutesApiProcess04RunMediaRunVideoRunVideoVideoGenerationDependencyGenerator | undefined
}

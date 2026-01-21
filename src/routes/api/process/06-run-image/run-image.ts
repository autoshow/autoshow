import type { Step6Metadata, ImageGenerationResult } from '~/types/main'
import type { IProgressTracker } from '~/types/progress'
import { l } from '~/utils/logging'
import { generateImages as generateImagesOpenAI } from './image-services/run-chatgpt-image'

export const generateImages = async (
  title: string,
  summary: string,
  selectedPrompts: string[],
  outputDir: string,
  progressTracker?: IProgressTracker
): Promise<{ results: ImageGenerationResult[], metadata: Step6Metadata }> => {
  l('Step 6: Generate AI Images', {
    promptCount: selectedPrompts.length,
    prompts: selectedPrompts
  })
  
  progressTracker?.updateStepProgress(6, 10, 'Starting image generation')
  
  const result = await generateImagesOpenAI(title, summary, selectedPrompts, outputDir, progressTracker)
  
  progressTracker?.completeStep(6, 'Image generation complete')
  
  return result
}